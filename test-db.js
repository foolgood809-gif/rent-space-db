const db = require("./rent-space/src/config/db");

async function testConnection() {
  try {
    const [rows] = await db.query("SELECT DATABASE() AS databaseName");
    console.log("เชื่อมต่อ MySQL สำเร็จ:", rows[0].databaseName);
  } catch (error) {
    const reason = error.message || error.code || String(error);
    console.error("เชื่อมต่อ MySQL ไม่สำเร็จ:", reason);
    process.exitCode = 1;
  } finally {
    await db.end();
  }
}

testConnection();
