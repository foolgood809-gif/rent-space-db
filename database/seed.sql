USE rent_space;

-- Development-only sample accounts. password_hash is deliberately unusable;
-- these rows are for UI and relationship checks, not for signing in.
INSERT INTO users (user_id, name, username, email, password_hash, role) VALUES
  (1001, 'เจ้าของตัวอย่าง', 'demo_owner', 'owner@example.test', 'SEED_ONLY_NOT_A_LOGIN_HASH', 'owner'),
  (1002, 'ลูกค้าตัวอย่าง', 'demo_customer', 'customer@example.test', 'SEED_ONLY_NOT_A_LOGIN_HASH', 'customer')
ON DUPLICATE KEY UPDATE
  name = VALUES(name), username = VALUES(username), email = VALUES(email),
  password_hash = VALUES(password_hash), role = VALUES(role);

INSERT INTO spaces (space_id, owner_id, title, description, location, price_per_day, status) VALUES
  (2001, 1001, 'ห้องประชุมสว่างใจ', 'ห้องประชุมพร้อมจอภาพและ Wi-Fi เหมาะสำหรับทีมขนาดเล็ก', 'สุขุมวิท, กรุงเทพมหานคร', 1800.00, 'approved'),
  (2002, 1001, 'สตูดิโอแสงธรรมชาติ', 'สตูดิโอถ่ายภาพพร้อมฉากพื้นฐานและพื้นที่แต่งตัว', 'อารีย์, กรุงเทพมหานคร', 2500.00, 'approved'),
  (2003, 1001, 'พื้นที่จัดเวิร์กช็อป', 'พื้นที่อเนกประสงค์สำหรับกิจกรรมกลุ่ม', 'เชียงใหม่', 3200.00, 'pending')
ON DUPLICATE KEY UPDATE
  owner_id = VALUES(owner_id), title = VALUES(title), description = VALUES(description),
  location = VALUES(location), price_per_day = VALUES(price_per_day), status = VALUES(status);

INSERT INTO bookings (booking_id, space_id, customer_id, start_date, end_date, status) VALUES
  (3001, 2001, 1002, '2026-11-15', '2026-11-16', 'pending'),
  (3002, 2002, 1002, '2026-11-20', '2026-11-21', 'approved')
ON DUPLICATE KEY UPDATE
  space_id = VALUES(space_id), customer_id = VALUES(customer_id),
  start_date = VALUES(start_date), end_date = VALUES(end_date), status = VALUES(status);
