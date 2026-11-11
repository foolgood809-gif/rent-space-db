const crypto = require("node:crypto");
const { promisify } = require("node:util");
const readline = require("node:readline");
const scrypt = promisify(crypto.scrypt);
const db = require("../src/config/db");

const username = process.argv[2];
if (!username || !process.stdin.isTTY || !process.stdin.setRawMode) {
  console.error("Usage: node scripts/set-password.js <username> (run in an interactive terminal)");
  process.exitCode = 1;
  db.end();
} else {
  const input = process.stdin;
  readline.emitKeypressEvents(input);
  input.setRawMode(true);
  input.resume();
  process.stdout.write(`New password for ${username} (10+ chars): `);
  let password = "";
  const finish = async () => {
    input.removeAllListeners("keypress");
    input.setRawMode(false);
    input.pause();
    process.stdout.write("\n");
    if (password.length < 10 || password.length > 200) {
      console.error("Password must be between 10 and 200 characters.");
      await db.end();
      process.exitCode = 1;
      return;
    }
    const salt = crypto.randomBytes(16);
    const derived = await scrypt(password, salt, 64, { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
    const encoded = `scrypt$${salt.toString("hex")}$${derived.toString("hex")}`;
    try {
      const [users] = await db.execute("SELECT user_id FROM users WHERE username = ?", [username]);
      if (!users.length) {
        console.error("No account found with that username.");
        process.exitCode = 1;
      } else {
        await db.execute("UPDATE users SET password_hash = ? WHERE user_id = ?", [encoded, users[0].user_id]);
        await db.execute("DELETE FROM auth_sessions WHERE user_id = ?", [users[0].user_id]);
        console.log("Password updated and active sessions revoked.");
      }
    } finally {
      password = "";
      await db.end();
    }
  };
  input.on("keypress", (char, key) => {
    if (key.ctrl && key.name === "c") { input.removeAllListeners("keypress"); input.setRawMode(false); input.pause(); process.stdout.write("\nCancelled.\n"); password = ""; void db.end(); process.exitCode = 1; return; }
    if (key.name === "return" || key.name === "enter") { input.removeAllListeners("keypress"); void finish(); return; }
    if (key.name === "backspace") { password = password.slice(0, -1); return; }
    if (char && !key.ctrl && !key.meta) password += char;
  });
}
