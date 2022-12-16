const fs = require("fs");

const rl = require("readline").createInterface({
  input: process.stdin,
  output: process.stdout,
});

const db = require("better-sqlite3")("db.sqlite", {
  verbose: console.log("~~ Bulletin Board CLI App ~~\n"),
});

if (
  db
    .prepare(
      `SELECT COUNT(*) AS isTableExist 
       FROM sqlite_master 
       WHERE name='users'`
    )
    .get().isTableExist === 0
) {
  db.exec(fs.readFileSync("schema.sql", "utf8"));
}

const queryUserEmail = db.prepare(
  `SELECT name
   FROM users
   WHERE email = ?`
);

const signIn = () => {
  return new Promise((resolve, reject) => {
    rl.question("Enter email to Sign in: ", (email) => {
      if (queryUserEmail.get(email) === undefined) {
        console.log(`There's no user using email "${email}"`);
        rl.question("Do you want to Sign up? [Y/n]: ", (input) => {
          if (
            input === "Y" ||
            input === "y" ||
            input === "yes" ||
            input === "Yes"
          ) {
            rl.question("Enter name: ", (name) => {
              db.prepare(
                `INSERT INTO users (name, email) 
                 VALUES (@name, @email)`
              ).run({ name, email });
              resolve(email);
            });
          } else {
            console.log("Close App");
            process.exit();
          }
        });
      } else {
        resolve(email);
      }
    });
  });
};

const getPostById = () => {
  return new Promise((resolve, reject) => {
    rl.question("Enter a post_id to view: ", (id) => {
      resolve([
        db
          .prepare(
            `SELECT title, content, author, created_at, edited_at 
             FROM posts 
             WHERE post_id = ?`
          )
          .get(id),
        db
          .prepare(`SELECT COUNT(*) AS likes FROM likes WHERE post_id = ?`)
          .get(id),
      ]);
    });
  });
};

const getAuthorId = (post_id) => {
  return new Promise((resolve, reject) => {
    resolve(
      db.prepare("SELECT user_id FROM posts WHERE post_id = ?").get(post_id)
        .user_id
    );
  });
};

const getTitle = () => {
  return new Promise((resolve, reject) => {
    rl.question("Enter the title: ", (title) => {
      resolve(title);
    });
  });
};

const getContent = () => {
  return new Promise((resolve, reject) => {
    rl.question("Enter the content: ", (content) => {
      resolve(content);
    });
  });
};

const getPostId = (purpose) => {
  return new Promise((resolve, reject) => {
    rl.question(`Enter a post_id to ${purpose}: `, async (id) => {
      resolve(id);
    });
  });
};

const isPostLikedByUser = (user_id, post_id) => {
  return new Promise((resolve, reject) => {
    resolve(
      db
        .prepare(
          `SELECT 
            EXISTS (
              SELECT * 
              FROM likes 
              WHERE user_id = ? AND post_id = ?
            ) AS result`
        )
        .get(user_id, post_id).result
    );
  });
};

const main = async () => {
  const userEmail = await signIn();
  const userId = db
    .prepare("SELECT user_id FROM users WHERE email = ?")
    .get(userEmail).user_id;
  const userName = db
    .prepare("SELECT name FROM users WHERE email = ?")
    .get(userEmail).name;

  console.log(`Welcome ${userName}`);
  console.log(
    `\n${userName}, Choose a number:\n1. List of posts\n2. View a post\n3. Create a post\n4. Edit a post\n5. Delete a post\n6. Like/Unlike a Post\n7. List of liked posts\n0. Close App`
  );
  rl.on("line", async (line) => {
    if (line === "0") {
      rl.close();
    }
    if (line === "1") {
      console.log(
        db
          .prepare(
            `SELECT post_id, title, created_at, author, COUNT(likes.user_id) AS likes 
             FROM posts 
             LEFT JOIN likes 
             USING(post_id) 
             GROUP BY post_id
             ORDER BY created_at DESC`
          )
          .all()
      );
    }
    if (line === "2") {
      const post = await getPostById();
      console.log({ ...post[0], ...post[1] });
    }
    if (line === "3") {
      const title = await getTitle();
      const content = await getContent();
      db.prepare(
        "INSERT INTO posts (title, content, user_id, author) VALUES (@title, @content, @user_id, @author)"
      ).run({ title, content, user_id: userId, author: userName });
    }
    if (line === "4") {
      const postId = await getPostId("Edit");
      const authorId = await getAuthorId(postId);
      console.log(authorId);
      if (!authorId) {
        console.log("The post is not exist.");
      } else if (authorId !== userId) {
        console.log("Failed to edit. The post was not posted by you.");
      } else {
        const title = await getTitle();
        const content = await getContent();
        db.prepare(
          "UPDATE posts SET title = ?, content = ?, edited_at = datetime('now', 'localtime') WHERE post_id = ?"
        ).run(title, content, postId);
        console.log("The post edited.");
      }
    }
    if (line === "5") {
      const postId = await getPostId("Delete");
      const authorId = await getAuthorId(postId);

      if (!authorId) {
        console.log("The post is not exist.");
      } else if (authorId !== userId) {
        console.log("Failed to delete. The post was not posted by you.");
      } else {
        db.prepare("DELETE FROM posts WHERE post_id = ?").run(postId);
        console.log("The post deleted.");
      }
    }
    if (line === "6") {
      const postId = await getPostId("like/unlike");

      if (!(await getAuthorId(postId))) {
        console.log("The post is not exist.");
      } else {
        if (await isPostLikedByUser(userId, postId)) {
          db.prepare("DELETE FROM likes WHERE user_id = ? AND post_id = ?").run(
            userId,
            postId
          );
          console.log("You unlike the post.");
        } else {
          db.prepare("INSERT INTO likes (user_id, post_id) VALUES (?, ?)").run(
            userId,
            postId
          );
          console.log("You like the post.");
        }
      }
    }
    if (line === "7") {
      console.log(
        db
          .prepare(
            `SELECT post_id, title, created_at, author 
              FROM posts 
              WHERE post_id 
              IN (
                SELECT post_id 
                FROM likes 
                WHERE user_id = ?
              )
              ORDER BY created_at DESC`
          )
          .all(userId)
      );
    }

    console.log(
      `\n${userName}, Choose a number:\n1. List of posts\n2. View a post\n3. Create a post\n4. Edit a post\n5. Delete a post\n6. Like/Unlike a Post\n7. List of liked posts\n0. Close App`
    );
  }).on("close", () => {
    console.log("Closing App...");
    process.exit();
  });
};

main();
