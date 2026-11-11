const path = require("node:path");
const mysql = require("mysql2/promise");

require("dotenv").config({
  path: path.resolve(__dirname, "../../.env"),
});

const requiredSettings = ["DB_HOST", "DB_USER", "DB_NAME"];
const missingSettings = requiredSettings.filter((key) => !process.env[key]);

if (missingSettings.length > 0) {
  throw new Error(`Missing database settings in .env: ${missingSettings.join(", ")}`);
}

module.exports = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});
