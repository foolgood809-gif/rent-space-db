const crypto = require("node:crypto");

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

async function requireAuth(req, res, next) {
  const match = /^Bearer\s+([A-Za-z0-9_-]{40,})$/i.exec(req.get("Authorization") || "");
  if (!match) return res.status(401).json({ error: "กรุณาเข้าสู่ระบบ" });

  try {
    const [rows] = await req.db.execute(
      `SELECT u.user_id, u.name, u.username, u.email, u.role
       FROM auth_sessions s JOIN users u ON u.user_id = s.user_id
       WHERE s.token_hash = ? AND s.expires_at > CURRENT_TIMESTAMP AND u.status = 'active'`,
      [hashToken(match[1])]
    );
    if (!rows.length) return res.status(401).json({ error: "เซสชันหมดอายุหรือไม่ถูกต้อง กรุณาเข้าสู่ระบบใหม่" });
    req.user = rows[0];
    next();
  } catch (error) {
    console.error("Authentication failed:", error.code || error.message);
    res.status(500).json({ error: "ไม่สามารถตรวจสอบการเข้าสู่ระบบได้" });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: "กรุณาเข้าสู่ระบบ" });
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: "บัญชีนี้ไม่มีสิทธิ์ทำรายการนี้" });
    next();
  };
}

module.exports = { requireAuth, requireRole, hashToken };
