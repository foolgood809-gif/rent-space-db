const db = require("./src/config/db");

async function testDatabase() {
  try {
    const [dbRows] = await db.query("SELECT DATABASE() AS databaseName");
    console.log("เชื่อมต่อ MySQL สำเร็จ:", dbRows[0].databaseName);

    // ทดสอบอ่านรายการจอง พร้อมชื่อผู้จองและชื่อพื้นที่
    const [bookings] = await db.query(`
      SELECT
        b.booking_id,
        u.username,
        s.title,
        b.start_date,
        b.end_date,
        b.status
      FROM bookings AS b
      JOIN users AS u ON u.user_id = b.customer_id
      JOIN spaces AS s ON s.space_id = b.space_id
      ORDER BY b.booking_id
    `);

    console.log("\nรายการจอง:");
    console.table(bookings);

    if (bookings.length === 0) {
      console.log("ยังไม่มีข้อมูลการจองที่เชื่อมกับผู้ใช้และพื้นที่");
    } else {
      console.log(`อ่านข้อมูลการจองสำเร็จ ${bookings.length} รายการ`);
    }

    // อ่านพื้นที่ทั้งหมด เรียงตาม space_id
    const [spaces] = await db.query(`
      SELECT
        space_id,
        owner_id,
        title,
        location,
        price_per_day,
        status
      FROM spaces
      ORDER BY space_id
    `);

    console.log("\nพื้นที่ทั้งหมด:");
    console.table(spaces);
    console.log(`อ่านข้อมูลพื้นที่สำเร็จ ${spaces.length} รายการ`);
  } catch (error) {
    console.error("ทดสอบฐานข้อมูลไม่สำเร็จ:", error.code || error.message);
    process.exitCode = 1;
  } finally {
    await db.end();
  }
}

testDatabase();
