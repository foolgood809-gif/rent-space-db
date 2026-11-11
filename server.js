const express = require("express");
const db = require("./src/config/db");
const { requireAuth, requireRole } = require("./src/middleware/auth");

const app = express();
const port = Number(process.env.PORT || 3000);

app.use(express.json());
app.use((req, _res, next) => { req.db = db; next(); });

const requireAdmin = [requireAuth, requireRole("admin"), (req, _res, next) => {
  req.admin = { id: req.user.user_id, name: req.user.name };
  next();
}];
const validDate = (value) => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
};

app.use("/api", require("./src/routes/auth")(db));

async function logAdminAction(admin, action, targetType, targetId, details) {
  try {
    await db.execute(
      `INSERT INTO admin_logs (admin_id, admin_name, action, target_type, target_id, details)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [admin.id, admin.name, action, targetType, targetId, details]
    );
  } catch (error) {
    // Do not hide a successful domain change if an audit insert fails.
    console.error("Admin audit log insert failed:", error.code || error.message);
  }
}

app.get("/api/spaces", async (req, res) => {
  try {
    const [spaces] = await db.query(
      `SELECT space_id, owner_id, title, description, location,
              price_per_day, status, created_at
       FROM spaces
       ORDER BY space_id DESC`
    );
    res.json(spaces);
  } catch (error) {
    console.error("GET /api/spaces failed:", error.code || error.message);
    res.status(500).json({ error: "ไม่สามารถอ่านข้อมูลพื้นที่ได้" });
  }
});

app.post("/api/spaces", requireAuth, requireRole("owner", "admin"), async (req, res) => {
  const { title, description = null, location, price_per_day } = req.body;
  const ownerId = req.user.user_id;
  const price = Number(price_per_day);
  const validPrice = /^(?:0|[1-9]\d{0,7})(?:\.\d{1,2})?$/.test(String(price_per_day));

  if (
    !Number.isSafeInteger(ownerId) || ownerId < 1 ||
    typeof title !== "string" || !title.trim() || title.trim().length > 150 ||
    typeof location !== "string" || !location.trim() || location.trim().length > 255 ||
    (description !== null && typeof description !== "string") ||
    !validPrice ||
    !Number.isFinite(price) ||
    price < 0
  ) {
    return res.status(400).json({
      error: "กรุณาส่ง title (ไม่เกิน 150 ตัวอักษร), location (ไม่เกิน 255 ตัวอักษร) และ price_per_day (0 ถึง 99,999,999.99 ไม่เกิน 2 ตำแหน่ง) ให้ถูกต้อง",
    });
  }

  try {
    const [result] = await db.execute(
      `INSERT INTO spaces
         (owner_id, title, description, location, price_per_day, status)
       VALUES (?, ?, ?, ?, ?, 'pending')`,
      [ownerId, title.trim(), description, location.trim(), price]
    );

    const [rows] = await db.execute(
      `SELECT space_id, owner_id, title, description, location,
              price_per_day, status, created_at
       FROM spaces WHERE space_id = ?`,
      [result.insertId]
    );

    res.status(201).json({ message: "เพิ่มพื้นที่สำเร็จ", space: rows[0] });
  } catch (error) {
    if (error.code === "ER_NO_REFERENCED_ROW_2") {
      return res.status(400).json({ error: "ไม่พบ owner_id นี้ในตาราง users" });
    }
    console.error("POST /api/spaces failed:", error.code || error.message);
    res.status(500).json({ error: "ไม่สามารถเพิ่มข้อมูลพื้นที่ได้" });
  }
});

app.patch("/api/spaces/:spaceId/status", requireAdmin, async (req, res) => {
  const spaceId = Number(req.params.spaceId);
  const { status } = req.body;
  const allowedStatuses = ["pending", "approved", "rejected"];

  if (!Number.isSafeInteger(spaceId) || spaceId < 1) {
    return res.status(400).json({ error: "spaceId ไม่ถูกต้อง" });
  }
  if (!allowedStatuses.includes(status)) {
    return res.status(400).json({
      error: "status ต้องเป็น pending, approved หรือ rejected",
    });
  }

  try {
    const [currentRows] = await db.execute(
      "SELECT status FROM spaces WHERE space_id = ?",
      [spaceId]
    );
    if (currentRows.length === 0) {
      return res.status(404).json({ error: "ไม่พบพื้นที่นี้" });
    }
    const transitions = {
      pending: ["approved", "rejected"],
      approved: [],
      rejected: ["pending"],
    };
    if (!transitions[currentRows[0].status].includes(status)) {
      return res.status(409).json({ error: `ไม่สามารถเปลี่ยนสถานะจาก ${currentRows[0].status} เป็น ${status} ได้` });
    }
    const [result] = await db.execute(
      "UPDATE spaces SET status = ? WHERE space_id = ? AND status = ?",
      [status, spaceId, currentRows[0].status]
    );

    if (result.affectedRows === 0) {
      return res.status(409).json({ error: "สถานะพื้นที่เปลี่ยนไปแล้ว กรุณาโหลดข้อมูลใหม่" });
    }

    const [rows] = await db.execute(
      `SELECT space_id, owner_id, title, description, location,
              price_per_day, status, created_at
       FROM spaces WHERE space_id = ?`,
      [spaceId]
    );

    await logAdminAction(
      req.admin,
      "UPDATE_SPACE_STATUS",
      "space",
      spaceId,
      `${currentRows[0].status} -> ${status}`
    );

    res.json({ message: "อัปเดตสถานะพื้นที่สำเร็จ", space: rows[0] });
  } catch (error) {
    console.error("PATCH /api/spaces/:spaceId/status failed:", error.code || error.message);
    res.status(500).json({ error: "ไม่สามารถอัปเดตสถานะพื้นที่ได้" });
  }
});

app.delete("/api/spaces/:spaceId", requireAuth, async (req, res) => {
  const spaceId = Number(req.params.spaceId);
  if (!Number.isSafeInteger(spaceId) || spaceId < 1) {
    return res.status(400).json({ error: "spaceId ไม่ถูกต้อง" });
  }

  try {
    if (req.user.role !== "admin") {
      const [owned] = await db.execute("SELECT space_id FROM spaces WHERE space_id = ? AND owner_id = ?", [spaceId, req.user.user_id]);
      if (!owned.length) return res.status(403).json({ error: "ไม่มีสิทธิ์ลบพื้นที่นี้" });
    }
    const [result] = await db.execute(
      "DELETE FROM spaces WHERE space_id = ?",
      [spaceId]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "ไม่พบพื้นที่นี้" });
    }
    res.json({ message: "ลบพื้นที่สำเร็จ", space_id: spaceId });
  } catch (error) {
    if (error.code === "ER_ROW_IS_REFERENCED_2") {
      return res.status(409).json({
        error: "ลบพื้นที่นี้ไม่ได้ เพราะยังมีรายการจองอ้างถึงอยู่ ให้ลบรายการจองก่อน",
      });
    }
    console.error("DELETE /api/spaces/:spaceId failed:", error.code || error.message);
    res.status(500).json({ error: "ไม่สามารถลบพื้นที่ได้" });
  }
});

app.get("/api/spaces/:spaceId/availability", async (req, res) => {
  const spaceId = Number(req.params.spaceId);
  const { start_date: startDate, end_date: endDate } = req.query;
  if (!Number.isSafeInteger(spaceId) || spaceId < 1 || !validDate(startDate) || !validDate(endDate) || endDate <= startDate) {
    return res.status(400).json({ error: "กรุณาระบุ spaceId และ start_date/end_date ที่ถูกต้อง โดย end_date ต้องอยู่หลัง start_date" });
  }
  try {
    const [spaces] = await db.execute("SELECT space_id FROM spaces WHERE space_id = ? AND status = 'approved'", [spaceId]);
    if (!spaces.length) return res.status(404).json({ error: "ไม่พบพื้นที่ที่เปิดให้จอง" });
    const [bookings] = await db.execute(
      `SELECT booking_id, start_date, end_date, status FROM bookings
       WHERE space_id = ? AND status IN ('pending', 'approved', 'confirmed')
         AND start_date < ? AND end_date > ? ORDER BY start_date`,
      [spaceId, endDate, startDate]
    );
    const [blocks] = await db.execute(
      `SELECT block_id, start_date, end_date, reason FROM room_blocks
       WHERE space_id = ? AND start_date < ? AND end_date > ? ORDER BY start_date`,
      [spaceId, endDate, startDate]
    );
    res.json({ space_id: spaceId, start_date: startDate, end_date: endDate, bookings, blocks });
  } catch (error) {
    console.error("GET /api/spaces/:spaceId/availability failed:", error.code || error.message);
    res.status(500).json({ error: "ไม่สามารถอ่านปฏิทินห้องได้" });
  }
});

app.post("/api/spaces/:spaceId/blocks", requireAuth, requireRole("owner", "admin"), async (req, res) => {
  const spaceId = Number(req.params.spaceId);
  const { start_date: startDate, end_date: endDate, reason = null } = req.body;
  if (!Number.isSafeInteger(spaceId) || spaceId < 1 || !validDate(startDate) || !validDate(endDate) || endDate <= startDate ||
      (reason !== null && (typeof reason !== "string" || reason.length > 255))) {
    return res.status(400).json({ error: "กรุณาระบุช่วงวันที่และ reason (ไม่เกิน 255 ตัวอักษร) ให้ถูกต้อง" });
  }
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [spaces] = await connection.execute("SELECT space_id, owner_id FROM spaces WHERE space_id = ? FOR UPDATE", [spaceId]);
    if (!spaces.length) { await connection.rollback(); return res.status(404).json({ error: "ไม่พบพื้นที่นี้" }); }
    if (req.user.role !== "admin" && spaces[0].owner_id !== req.user.user_id) {
      await connection.rollback(); return res.status(403).json({ error: "ไม่มีสิทธิ์ปิดพื้นที่นี้" });
    }
    const [overlaps] = await connection.execute(
      `SELECT booking_id FROM bookings WHERE space_id = ? AND status IN ('pending', 'approved', 'confirmed')
       AND start_date < ? AND end_date > ? LIMIT 1`, [spaceId, endDate, startDate]
    );
    if (overlaps.length) { await connection.rollback(); return res.status(409).json({ error: "มีรายการจองในช่วงวันที่นี้ จึงปิดห้องไม่ได้" }); }
    const [result] = await connection.execute(
      "INSERT INTO room_blocks (space_id, created_by, start_date, end_date, reason) VALUES (?, ?, ?, ?, ?)",
      [spaceId, req.user.user_id, startDate, endDate, reason]
    );
    await connection.commit();
    const [rows] = await db.execute("SELECT block_id, space_id, created_by, start_date, end_date, reason, created_at FROM room_blocks WHERE block_id = ?", [result.insertId]);
    if (req.user.role === "admin") await logAdminAction(req.admin || { id: req.user.user_id, name: req.user.name }, "CREATE_ROOM_BLOCK", "space", spaceId, `${startDate}..${endDate}`);
    res.status(201).json({ message: "ปิดห้องตามช่วงเวลาสำเร็จ", block: rows[0] });
  } catch (error) {
    await connection.rollback();
    console.error("POST /api/spaces/:spaceId/blocks failed:", error.code || error.message);
    res.status(500).json({ error: "ไม่สามารถปิดห้องได้" });
  } finally { connection.release(); }
});

app.delete("/api/spaces/:spaceId/blocks/:blockId", requireAuth, requireRole("owner", "admin"), async (req, res) => {
  const spaceId = Number(req.params.spaceId);
  const blockId = Number(req.params.blockId);
  if (!Number.isSafeInteger(spaceId) || spaceId < 1 || !Number.isSafeInteger(blockId) || blockId < 1) {
    return res.status(400).json({ error: "spaceId หรือ blockId ไม่ถูกต้อง" });
  }
  try {
    const [rows] = await db.execute(
      `SELECT rb.block_id, s.owner_id FROM room_blocks rb JOIN spaces s ON s.space_id = rb.space_id
       WHERE rb.block_id = ? AND rb.space_id = ?`, [blockId, spaceId]
    );
    if (!rows.length) return res.status(404).json({ error: "ไม่พบรายการปิดห้องนี้" });
    if (req.user.role !== "admin" && rows[0].owner_id !== req.user.user_id) return res.status(403).json({ error: "ไม่มีสิทธิ์เปิดห้องนี้" });
    await db.execute("DELETE FROM room_blocks WHERE block_id = ?", [blockId]);
    if (req.user.role === "admin") {
      await logAdminAction({ id: req.user.user_id, name: req.user.name }, "DELETE_ROOM_BLOCK", "space", spaceId, `block_id=${blockId}`);
    }
    res.json({ message: "ยกเลิกการปิดห้องสำเร็จ", block_id: blockId });
  } catch (error) {
    console.error("DELETE /api/spaces/:spaceId/blocks/:blockId failed:", error.code || error.message);
    res.status(500).json({ error: "ไม่สามารถยกเลิกการปิดห้องได้" });
  }
});

app.get("/api/bookings/history", requireAuth, async (req, res) => {
  try {
    let scope = "";
    const params = [];
    if (req.user.role === "customer") { scope = "WHERE b.customer_id = ?"; params.push(req.user.user_id); }
    else if (req.user.role === "owner") { scope = "WHERE s.owner_id = ?"; params.push(req.user.user_id); }
    const [rows] = await db.execute(
      `SELECT b.booking_id, b.space_id, s.title, b.customer_id, u.username, b.start_date, b.end_date,
              b.status, b.created_at, p.payment_id, p.amount, p.payment_method, p.status AS payment_status, p.paid_at
       FROM bookings b JOIN users u ON u.user_id = b.customer_id JOIN spaces s ON s.space_id = b.space_id
       LEFT JOIN payments p ON p.booking_id = b.booking_id ${scope} ORDER BY b.start_date DESC, b.booking_id DESC`, params
    );
    res.json(rows);
  } catch (error) {
    console.error("GET /api/bookings/history failed:", error.code || error.message);
    res.status(500).json({ error: "ไม่สามารถอ่านประวัติการจองได้" });
  }
});

app.get("/api/bookings", requireAuth, async (req, res) => {
  try {
    let where = "";
    const params = [];
    if (req.user.role === "customer") { where = "WHERE b.customer_id = ?"; params.push(req.user.user_id); }
    else if (req.user.role === "owner") { where = "WHERE s.owner_id = ?"; params.push(req.user.user_id); }
    const [bookings] = await db.execute(
      `SELECT b.booking_id, b.space_id, s.title, b.customer_id, u.username,
              b.start_date, b.end_date, b.status, b.created_at
       FROM bookings AS b
       JOIN users AS u ON u.user_id = b.customer_id
       JOIN spaces AS s ON s.space_id = b.space_id
       ${where} ORDER BY b.booking_id DESC`, params
    );
    res.json(bookings);
  } catch (error) {
    console.error("GET /api/bookings failed:", error.code || error.message);
    res.status(500).json({ error: "ไม่สามารถอ่านข้อมูลการจองได้" });
  }
});

app.post("/api/bookings", requireAuth, requireRole("customer"), async (req, res) => {
  const { space_id, start_date, end_date } = req.body;
  const spaceId = Number(space_id);
  const customerId = req.user.user_id;

  if (
    !Number.isSafeInteger(spaceId) || spaceId < 1 ||
    !validDate(start_date) || !validDate(end_date) ||
    end_date <= start_date
  ) {
    return res.status(400).json({
      error: "กรุณาส่ง space_id และวันที่รูปแบบ YYYY-MM-DD ให้ถูกต้อง โดย end_date ต้องอยู่หลัง start_date",
    });
  }

  try {
    // Lock the space row so concurrent requests cannot both pass the overlap check.
    const connection = await db.getConnection();
    let result;
    try {
      await connection.beginTransaction();
      const [spaces] = await connection.execute(
        "SELECT space_id, status FROM spaces WHERE space_id = ? FOR UPDATE",
        [spaceId]
      );
      if (spaces.length === 0) {
        await connection.rollback();
        return res.status(400).json({ error: "ไม่พบพื้นที่นี้" });
      }
      if (spaces[0].status !== "approved") {
        await connection.rollback();
        return res.status(409).json({ error: "จองได้เฉพาะพื้นที่ที่อนุมัติแล้ว" });
      }
      const [overlaps] = await connection.execute(
        `SELECT booking_id FROM bookings
         WHERE space_id = ? AND status IN ('pending', 'approved', 'confirmed')
           AND start_date < ? AND end_date > ?
         LIMIT 1`,
        [spaceId, end_date, start_date]
      );
      if (overlaps.length > 0) {
        await connection.rollback();
        return res.status(409).json({ error: "ช่วงวันที่เลือกมีรายการจองที่ยังใช้งานอยู่แล้ว" });
      }
      const [blocks] = await connection.execute(
        "SELECT block_id FROM room_blocks WHERE space_id = ? AND start_date < ? AND end_date > ? LIMIT 1",
        [spaceId, end_date, start_date]
      );
      if (blocks.length) {
        await connection.rollback();
        return res.status(409).json({ error: "ห้องถูกปิดในช่วงวันที่เลือก" });
      }
      const [insertResult] = await connection.execute(
        `INSERT INTO bookings (space_id, customer_id, start_date, end_date, status)
         VALUES (?, ?, ?, ?, 'pending')`,
        [spaceId, customerId, start_date, end_date]
      );
      result = insertResult;
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    const [rows] = await db.execute(
      `SELECT b.booking_id, b.space_id, s.title, b.customer_id, u.username,
              b.start_date, b.end_date, b.status, b.created_at
       FROM bookings AS b
       JOIN users AS u ON u.user_id = b.customer_id
       JOIN spaces AS s ON s.space_id = b.space_id
       WHERE b.booking_id = ?`,
      [result.insertId]
    );

    res.status(201).json({ message: "สร้างรายการจองสำเร็จ", booking: rows[0] });
  } catch (error) {
    if (error.code === "ER_NO_REFERENCED_ROW_2") {
      return res.status(400).json({ error: "ไม่พบ space_id หรือบัญชีผู้ใช้ในฐานข้อมูล" });
    }
    console.error("POST /api/bookings failed:", error.code || error.message);
    res.status(500).json({ error: "ไม่สามารถสร้างรายการจองได้" });
  }
});

app.patch("/api/bookings/:bookingId/status", requireAdmin, async (req, res) => {
  const bookingId = Number(req.params.bookingId);
  const { status } = req.body;
  const allowedStatuses = ["approved", "rejected", "cancelled"];

  if (!Number.isSafeInteger(bookingId) || bookingId < 1) {
    return res.status(400).json({ error: "bookingId ไม่ถูกต้อง" });
  }
  if (!allowedStatuses.includes(status)) {
    return res.status(400).json({
      error: "status ต้องเป็น approved, rejected หรือ cancelled",
    });
  }

  try {
    const [currentRows] = await db.execute(
      "SELECT status FROM bookings WHERE booking_id = ?",
      [bookingId]
    );
    if (currentRows.length === 0) {
      return res.status(404).json({ error: "ไม่พบรายการจองนี้" });
    }
    const transitions = {
      pending: ["approved", "rejected", "cancelled"],
      approved: ["cancelled"],
      rejected: [],
      cancelled: [],
    };
    if (!transitions[currentRows[0].status].includes(status)) {
      return res.status(409).json({ error: `ไม่สามารถเปลี่ยนสถานะจาก ${currentRows[0].status} เป็น ${status} ได้` });
    }
    const [result] = await db.execute(
      "UPDATE bookings SET status = ? WHERE booking_id = ? AND status = ?",
      [status, bookingId, currentRows[0].status]
    );

    if (result.affectedRows === 0) {
      return res.status(409).json({ error: "สถานะการจองเปลี่ยนไปแล้ว กรุณาโหลดข้อมูลใหม่" });
    }

    const [rows] = await db.execute(
      `SELECT b.booking_id, b.space_id, s.title, b.customer_id, u.username,
              b.start_date, b.end_date, b.status, b.created_at
       FROM bookings AS b
       JOIN users AS u ON u.user_id = b.customer_id
       JOIN spaces AS s ON s.space_id = b.space_id
       WHERE b.booking_id = ?`,
      [bookingId]
    );

    await logAdminAction(
      req.admin,
      "UPDATE_BOOKING_STATUS",
      "booking",
      bookingId,
      `${currentRows[0].status} -> ${status}`
    );

    res.json({ message: "อัปเดตสถานะการจองสำเร็จ", booking: rows[0] });
  } catch (error) {
    console.error("PATCH /api/bookings/:bookingId/status failed:", error.code || error.message);
    res.status(500).json({ error: "ไม่สามารถอัปเดตสถานะการจองได้" });
  }
});

app.delete("/api/bookings/:bookingId", requireAuth, async (req, res) => {
  const bookingId = Number(req.params.bookingId);
  if (!Number.isSafeInteger(bookingId) || bookingId < 1) {
    return res.status(400).json({ error: "bookingId ไม่ถูกต้อง" });
  }

  try {
    const [currentRows] = await db.execute(
      `SELECT b.status, b.customer_id, s.owner_id FROM bookings b JOIN spaces s ON s.space_id = b.space_id WHERE b.booking_id = ?`,
      [bookingId]
    );
    if (currentRows.length === 0) {
      return res.status(404).json({ error: "ไม่พบรายการจองนี้" });
    }
    const booking = currentRows[0];
    if (req.user.role !== "admin" && req.user.user_id !== booking.customer_id && req.user.user_id !== booking.owner_id) {
      return res.status(403).json({ error: "ไม่มีสิทธิ์ลบรายการจองนี้" });
    }
    if (currentRows[0].status === "approved") {
      return res.status(409).json({ error: "ลบรายการจองที่อนุมัติแล้วไม่ได้ ให้เปลี่ยนเป็น cancelled ก่อน" });
    }
    const [result] = await db.execute(
      "DELETE FROM bookings WHERE booking_id = ?",
      [bookingId]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "ไม่พบรายการจองนี้" });
    }
    res.json({ message: "ลบรายการจองสำเร็จ", booking_id: bookingId });
  } catch (error) {
    console.error("DELETE /api/bookings/:bookingId failed:", error.code || error.message);
    res.status(500).json({ error: "ไม่สามารถลบรายการจองได้" });
  }
});

app.use("/api", require("./extended-routes")(db, { requireAuth, requireRole, requireAdmin, logAdminAction }));

const server = app.listen(port, () => {
  console.log(`RentSpace API พร้อมใช้งานที่ http://localhost:${port}`);
});

async function shutdown() {
  server.close();
  await db.end();
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
