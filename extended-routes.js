const express = require("express");

const router = express.Router();

function positiveId(value) {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function moneyIsValid(value) {
  return /^(?:0|[1-9]\d{0,7})(?:\.\d{1,2})?$/.test(String(value));
}

module.exports = (db, { requireAuth, requireRole, requireAdmin, logAdminAction }) => {
  // Payments
  router.get("/payments", requireAuth, async (req, res) => {
    const bookingId = req.query.booking_id === undefined
      ? null
      : positiveId(req.query.booking_id);
    if (req.query.booking_id !== undefined && !bookingId) {
      return res.status(400).json({ error: "booking_id ไม่ถูกต้อง" });
    }

    try {
      let filter = "";
      const params = [];
      if (req.user.role !== "admin") {
        filter = req.user.role === "owner" ? "s.owner_id = ?" : "b.customer_id = ?";
        params.push(req.user.user_id);
      }
      if (bookingId) { filter += `${filter ? " AND " : ""}p.booking_id = ?`; params.push(bookingId); }
      const [rows] = await db.execute(
        `SELECT p.payment_id, p.booking_id, p.amount, p.payment_method, p.status,
                p.transaction_ref, p.slip_image_url, p.paid_at, p.created_at, p.updated_at
         FROM payments p JOIN bookings b ON b.booking_id = p.booking_id
         JOIN spaces s ON s.space_id = b.space_id ${filter ? `WHERE ${filter}` : ""}
         ORDER BY p.payment_id DESC`, params
      );
      res.json(rows);
    } catch (error) {
      console.error("GET /api/payments failed:", error.code || error.message);
      res.status(500).json({ error: "ไม่สามารถอ่านข้อมูลการชำระเงินได้" });
    }
  });

  router.post("/payments", requireAuth, requireRole("customer"), async (req, res) => {
    const { booking_id, amount, payment_method, transaction_ref = null, slip_image_url = null } = req.body;
    const bookingId = positiveId(booking_id);
    if (
      !bookingId || !moneyIsValid(amount) || Number(amount) < 0 ||
      typeof payment_method !== "string" || !payment_method.trim() || payment_method.trim().length > 40 ||
      (transaction_ref !== null && (typeof transaction_ref !== "string" || transaction_ref.length > 100)) ||
      (slip_image_url !== null && typeof slip_image_url !== "string")
    ) {
      return res.status(400).json({ error: "กรุณาส่ง booking_id, amount, payment_method และข้อมูลอ้างอิง/สลิปให้ถูกต้อง" });
    }

    try {
      const [bookings] = await db.execute("SELECT booking_id FROM bookings WHERE booking_id = ? AND customer_id = ?", [bookingId, req.user.user_id]);
      if (bookings.length === 0) return res.status(404).json({ error: "ไม่พบรายการจองนี้" });
      const status = transaction_ref || slip_image_url ? "submitted" : "pending";
      const [result] = await db.execute(
        `INSERT INTO payments (booking_id, amount, payment_method, status, transaction_ref, slip_image_url)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [bookingId, Number(amount), payment_method.trim(), status, transaction_ref, slip_image_url]
      );
      const [rows] = await db.execute(
        `SELECT payment_id, booking_id, amount, payment_method, status,
                transaction_ref, slip_image_url, paid_at, created_at, updated_at
         FROM payments WHERE payment_id = ?`,
        [result.insertId]
      );
      res.status(201).json({ message: "สร้างรายการชำระเงินสำเร็จ", payment: rows[0] });
    } catch (error) {
      console.error("POST /api/payments failed:", error.code || error.message);
      res.status(500).json({ error: "ไม่สามารถสร้างรายการชำระเงินได้" });
    }
  });

  router.patch("/payments/:paymentId/status", requireAdmin, async (req, res) => {
    const paymentId = positiveId(req.params.paymentId);
    const { status } = req.body;
    const transitions = {
      pending: ["submitted"],
      submitted: ["verified", "rejected"],
      rejected: ["submitted"],
      verified: ["refunded"],
      refunded: [],
    };
    if (!paymentId) return res.status(400).json({ error: "paymentId ไม่ถูกต้อง" });
    if (!Object.hasOwn(transitions, status)) {
      return res.status(400).json({ error: "status ต้องเป็น pending, submitted, verified, rejected หรือ refunded" });
    }

    try {
      const [payments] = await db.execute("SELECT status FROM payments WHERE payment_id = ?", [paymentId]);
      if (payments.length === 0) return res.status(404).json({ error: "ไม่พบรายการชำระเงินนี้" });
      const previousStatus = payments[0].status;
      if (!transitions[previousStatus]?.includes(status)) {
        return res.status(409).json({ error: `ไม่สามารถเปลี่ยนสถานะจาก ${previousStatus} เป็น ${status} ได้` });
      }
      const [result] = await db.execute(
        "UPDATE payments SET status = ?, paid_at = CASE WHEN ? = 'verified' THEN CURRENT_TIMESTAMP ELSE paid_at END WHERE payment_id = ? AND status = ?",
        [status, status, paymentId, previousStatus]
      );
      if (result.affectedRows === 0) return res.status(409).json({ error: "สถานะการชำระเงินเปลี่ยนไปแล้ว กรุณาโหลดข้อมูลใหม่" });
      await logAdminAction(req.admin, "UPDATE_PAYMENT_STATUS", "payment", paymentId, `${previousStatus} -> ${status}`);
      const [rows] = await db.execute(
        `SELECT payment_id, booking_id, amount, payment_method, status,
                transaction_ref, slip_image_url, paid_at, created_at, updated_at
         FROM payments WHERE payment_id = ?`,
        [paymentId]
      );
      res.json({ message: "อัปเดตสถานะการชำระเงินสำเร็จ", payment: rows[0] });
    } catch (error) {
      console.error("PATCH /api/payments/:paymentId/status failed:", error.code || error.message);
      res.status(500).json({ error: "ไม่สามารถอัปเดตสถานะการชำระเงินได้" });
    }
  });

  // Reviews
  router.get("/reviews", async (_req, res) => {
    try {
      const [rows] = await db.query(
        `SELECT r.review_id, r.booking_id, b.space_id, s.title, b.customer_id,
                u.username, r.rating, r.review_comment, r.created_at, r.updated_at
         FROM reviews AS r
         JOIN bookings AS b ON b.booking_id = r.booking_id
         JOIN spaces AS s ON s.space_id = b.space_id
         JOIN users AS u ON u.user_id = b.customer_id
         ORDER BY r.review_id DESC`
      );
      res.json(rows);
    } catch (error) {
      console.error("GET /api/reviews failed:", error.code || error.message);
      res.status(500).json({ error: "ไม่สามารถอ่านรีวิวได้" });
    }
  });

  router.post("/reviews", requireAuth, requireRole("customer"), async (req, res) => {
    const { booking_id, rating, review_comment = null } = req.body;
    const bookingId = positiveId(booking_id);
    const score = Number(rating);
    if (
      !bookingId || !Number.isInteger(score) || score < 1 || score > 5 ||
      (review_comment !== null && typeof review_comment !== "string")
    ) {
      return res.status(400).json({ error: "กรุณาส่ง booking_id และ rating ระหว่าง 1 ถึง 5 พร้อม review_comment ที่เป็นข้อความหรือ null" });
    }
    try {
      const [bookings] = await db.execute("SELECT booking_id FROM bookings WHERE booking_id = ? AND customer_id = ?", [bookingId, req.user.user_id]);
      if (bookings.length === 0) return res.status(404).json({ error: "ไม่พบรายการจองนี้" });
      const [result] = await db.execute(
        "INSERT INTO reviews (booking_id, rating, review_comment) VALUES (?, ?, ?)",
        [bookingId, score, review_comment]
      );
      const [rows] = await db.execute(
        `SELECT review_id, booking_id, rating, review_comment, created_at, updated_at
         FROM reviews WHERE review_id = ?`,
        [result.insertId]
      );
      res.status(201).json({ message: "เพิ่มรีวิวสำเร็จ", review: rows[0] });
    } catch (error) {
      if (error.code === "ER_DUP_ENTRY") return res.status(409).json({ error: "รายการจองนี้มีรีวิวแล้ว" });
      console.error("POST /api/reviews failed:", error.code || error.message);
      res.status(500).json({ error: "ไม่สามารถเพิ่มรีวิวได้" });
    }
  });

  // Amenities catalog and space assignments
  router.get("/amenities", async (_req, res) => {
    try {
      const [rows] = await db.query("SELECT amenity_id, name, description, icon, created_at FROM amenities ORDER BY name");
      res.json(rows);
    } catch (error) {
      console.error("GET /api/amenities failed:", error.code || error.message);
      res.status(500).json({ error: "ไม่สามารถอ่านสิ่งอำนวยความสะดวกได้" });
    }
  });

  router.post("/amenities", requireAdmin, async (req, res) => {
    const { name, description = null, icon = null } = req.body;
    if (
      typeof name !== "string" || !name.trim() || name.trim().length > 100 ||
      (description !== null && (typeof description !== "string" || description.length > 255)) ||
      (icon !== null && (typeof icon !== "string" || icon.length > 100))
    ) return res.status(400).json({ error: "กรุณาส่ง name (ไม่เกิน 100 ตัวอักษร), description และ icon ให้ถูกต้อง" });

    try {
      const [result] = await db.execute(
        "INSERT INTO amenities (name, description, icon) VALUES (?, ?, ?)",
        [name.trim(), description, icon]
      );
      await logAdminAction(req.admin, "CREATE_AMENITY", "amenity", result.insertId, `เพิ่มสิ่งอำนวยความสะดวก: ${name.trim()}`);
      const [rows] = await db.execute(
        "SELECT amenity_id, name, description, icon, created_at FROM amenities WHERE amenity_id = ?",
        [result.insertId]
      );
      res.status(201).json({ message: "เพิ่มสิ่งอำนวยความสะดวกสำเร็จ", amenity: rows[0] });
    } catch (error) {
      if (error.code === "ER_DUP_ENTRY") return res.status(409).json({ error: "มีสิ่งอำนวยความสะดวกชื่อนี้แล้ว" });
      console.error("POST /api/amenities failed:", error.code || error.message);
      res.status(500).json({ error: "ไม่สามารถเพิ่มสิ่งอำนวยความสะดวกได้" });
    }
  });

  router.put("/spaces/:spaceId/amenities", requireAdmin, async (req, res) => {
    const spaceId = positiveId(req.params.spaceId);
    const { amenity_ids: amenityIds } = req.body;
    if (!spaceId) return res.status(400).json({ error: "spaceId ไม่ถูกต้อง" });
    if (!Array.isArray(amenityIds) || amenityIds.some((id) => !positiveId(id))) {
      return res.status(400).json({ error: "amenity_ids ต้องเป็น array ของ ID จำนวนเต็มบวก" });
    }
    const uniqueIds = [...new Set(amenityIds.map(Number))];
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();
      const [spaces] = await connection.execute("SELECT space_id FROM spaces WHERE space_id = ?", [spaceId]);
      if (spaces.length === 0) {
        await connection.rollback();
        return res.status(404).json({ error: "ไม่พบพื้นที่นี้" });
      }
      if (uniqueIds.length) {
        const placeholders = uniqueIds.map(() => "?").join(",");
        const [amenities] = await connection.execute(
          `SELECT amenity_id FROM amenities WHERE amenity_id IN (${placeholders})`, uniqueIds
        );
        if (amenities.length !== uniqueIds.length) {
          await connection.rollback();
          return res.status(400).json({ error: "มี amenity_id บางรายการที่ไม่พบ" });
        }
      }
      await connection.execute("DELETE FROM space_amenities WHERE space_id = ?", [spaceId]);
      for (const amenityId of uniqueIds) {
        await connection.execute(
          "INSERT INTO space_amenities (space_id, amenity_id) VALUES (?, ?)",
          [spaceId, amenityId]
        );
      }
      await connection.commit();
      await logAdminAction(req.admin, "SET_SPACE_AMENITIES", "space", spaceId, `amenity_ids=${uniqueIds.join(",")}`);
      const [rows] = await db.execute(
        `SELECT a.amenity_id, a.name, a.description, a.icon
         FROM space_amenities AS sa JOIN amenities AS a ON a.amenity_id = sa.amenity_id
         WHERE sa.space_id = ? ORDER BY a.name`,
        [spaceId]
      );
      res.json({ message: "อัปเดตสิ่งอำนวยความสะดวกของพื้นที่สำเร็จ", space_id: spaceId, amenities: rows });
    } catch (error) {
      await connection.rollback();
      console.error("PUT /api/spaces/:spaceId/amenities failed:", error.code || error.message);
      res.status(500).json({ error: "ไม่สามารถอัปเดตสิ่งอำนวยความสะดวกของพื้นที่ได้" });
    } finally {
      connection.release();
    }
  });

  // Admin audit log: readable by an admin; written by admin actions above and
  // the space/booking approval handlers in server.js.
  router.get("/admin/logs", requireAdmin, async (_req, res) => {
    try {
      const [rows] = await db.query(
        `SELECT log_id, admin_id, admin_name, action, target_type, target_id, details, created_at
         FROM admin_logs ORDER BY log_id DESC LIMIT 200`
      );
      res.json(rows);
    } catch (error) {
      console.error("GET /api/admin/logs failed:", error.code || error.message);
      res.status(500).json({ error: "ไม่สามารถอ่านประวัติแอดมินได้" });
    }
  });

  return router;
};
