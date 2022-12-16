CREATE TABLE users(
    user_id INTEGER PRIMARY KEY, 
    name TEXT NOT NULL, 
    email TEXT NOT NULL UNIQUE
);
CREATE TABLE posts(
    post_id INTEGER PRIMARY KEY, 
    title TEXT NOT NULL, 
    content TEXT NOT NULL, 
    created_at TEXT DEFAULT (datetime('now', 'localtime')), 
    edited_at TEXT, 
    user_id INTEGER NOT NULL, 
    author TEXT NOT NULL, 
    FOREIGN KEY (user_id) REFERENCES users (user_id)
);
CREATE TABLE likes(
    user_id INTEGER,
    post_id INTEGER,
    PRIMARY KEY (user_id, post_id),
    FOREIGN KEY (user_id)
        REFERENCES users (user_id)
            ON DELETE CASCADE
            ON UPDATE NO ACTION,
    FOREIGN KEY (post_id)
        REFERENCES posts (post_id)
            ON DELETE CASCADE
            ON UPDATE NO ACTION
)