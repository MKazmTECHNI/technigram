const express = require("express");
const path = require("path");
const cors = require("cors");
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "")));
app.listen(3000, () => {
  console.log(`Server is running at http://localhost:3000`);
});
