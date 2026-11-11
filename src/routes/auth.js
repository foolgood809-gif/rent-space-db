const crypto = require("node:crypto");
const { promisify } = require("node:util");
const scrypt = promisify(crypto.scrypt);
const { hashToken, requireAuth } = require("../middleware/auth");

const SESSION_DAYS = 7;
const SCRYPT_OPTIONS = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };

async function passwordHash(password) {
  const salt = crypto.randomBytes(16);
  const derived = await scrypt(password, salt, 64, SCRYPT_OPTIONS);
  return `scrypt$${salt.toString("hex")}$${derived.toString("hex")}`;
}

async function passwordMatches(password, stored) {
  if (stored.startsWith("scrypt$")) {
    const [, saltHex, hashHex] = stored.split("$");
    if (!/^[a-f0-9]{32}$/i.test(saltHex || "") || !/^[a-f0-9]{128}$/i.test(hashHex || "")) return false;
    const actual = await scrypt(password, Buffer.from(saltHex, "hex"), 64, SCRYPT_OPTIONS);
    return crypto.timingSafeEqual(actual, Buffer.from(hashHex, "hex"));
  }
  return false;
}

module.exports = (db) => {
  const express = require("express");
  const router = express.Router();

  router.post("/auth/register", async (req, res) => {
    const { name, username, email, password } = req.body;
    if (typeof name !== "string" || !name.trim() || name.trim().length > 100 ||
        typeof username !== "string" || !/^[A-Za-z0-9_.-]{3,50}$/.test(username) ||
        typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 100 ||
        typeof password !== "string" || password.length < 10 || password.length > 200) {
      return res.status(400).json({ error: "กรุณาระบุ name, username, email และรหัสผ่านอย่างน้อย 10 ตัวอักษรให้ถูกต้อง" });
    }
    try {
      const encoded = await passwordHash(password);
      const [result] = await db.execute(
        "INSERT INTO users (name, username, email, password_hash, role, status) VALUES (?, ?, ?, ?, 'customer', 'active')",
        [name.trim(), username, email.trim().toLowerCase(), encoded]
      );
      res.status(201).json({ message: "สร้างบัญชีสำเร็จ กรุณาเข้าสู่ระบบ", user_id: result.insertId });
    } catch (error) {
      if (error.code === "ER_DUP_ENTRY") return res.status(409).json({ error: "username หรือ email นี้ถูกใช้แล้ว" });
      console.error("POST /api/auth/register failed:", error.code || error.message);
      res.status(500).json({ error: "ไม่สามารถสร้างบัญชีได้" });
    }
  });

  router.post("/auth/login", async (req, res) => {
    const { login, password } = req.body;
    if (typeof login !== "string" || typeof password !== "string" || password.length > 200) {
      return res.status(400).json({ error: "กรุณาระบุ login และ password" });
    }
    try {
      const [users] = await db.execute(
        "SELECT user_id, name, username, email, password_hash, role, status FROM users WHERE username = ? OR email = ? LIMIT 1",
        [login.trim(), login.trim().toLowerCase()]
      );
      const user = users[0];
      if (!user || user.status !== "active" || !(await passwordMatches(password, user.password_hash))) {
        return res.status(401).json({ error: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" });
      }
      const token = crypto.randomBytes(32).toString("base64url");
      const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
      await db.execute(
        "INSERT INTO auth_sessions (user_id, token_hash, expires_at) VALUES (?, ?, ?)",
        [user.user_id, hashToken(token), expiresAt]
      );
      res.json({ token, token_type: "Bearer", expires_at: expiresAt.toISOString(), user: {
        user_id: user.user_id, name: user.name, username: user.username, email: user.email, role: user.role,
      } });
    } catch (error) {
      console.error("POST /api/auth/login failed:", error.code || error.message);
      res.status(500).json({ error: "ไม่สามารถเข้าสู่ระบบได้" });
    }
  });

  router.get("/auth/me", requireAuth, (req, res) => res.json({ user: req.user }));
  router.post("/auth/logout", requireAuth, async (req, res) => {
    const token = /^Bearer\s+([A-Za-z0-9_-]{40,})$/i.exec(req.get("Authorization"))[1];
    try {
      await db.execute("DELETE FROM auth_sessions WHERE token_hash = ?", [hashToken(token)]);
      res.json({ message: "ออกจากระบบแล้ว" });
    } catch (error) {
      console.error("POST /api/auth/logout failed:", error.code || error.message);
      res.status(500).json({ error: "ไม่สามารถออกจากระบบได้" });
    }
  });
  return router;
};
