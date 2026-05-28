const sqlite3 = require("sqlite3").verbose();

const db = new sqlite3.Database("technigram.db");

// const sql = `INSERT INTO users (username, true_name, email) VALUES
// ('mkazm', 'Maciej', 'u123_mackaz_waw@technischools.com')`;
// const sql = `SELECT * FROM users`;
const sql = `UPDATE users SET true_name="Maciej Kaźmierczak" WHERE id=1`;
// const sql = `INSERT INTO allowed_emails (email) VALUES
// ('me@gmail.com')`

db.run(sql, function (err) {
  if (err) {
    console.error("Error modyfing into table:", err.message);
  } else {
    console.log("Finished succesfully");
    console.log();
  }
  db.close();
});
if (sql.startsWith("SELECT")) {
  db.all(sql, [], (err, rows) => {
    if (err) {
      console.error("Error retrieving data:", err.message);
    } else {
      console.log("Data retrieved successfully:");
      console.log(rows);
    }
    db.close();
  });
}
