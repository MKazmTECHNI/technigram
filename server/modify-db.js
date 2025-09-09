const sqlite3 = require("sqlite3").verbose();

const db = new sqlite3.Database("technigram.db");

const sql = `INSERT INTO allowed_emails (email) VALUES
('me@gmail.com')`

db.run(sql, function (err) {
    if (err) {
        console.error("Error inserting into table:", err.message);
    } else {
        console.log("Email inserted into 'allowed_emails' table.");
    }
    db.close();
});
