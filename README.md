# RentSpace

เว็บแอปสำหรับค้นหาและจองพื้นที่ให้เช่ารายวัน เช่น ห้องประชุมหรือสตูดิโอ

## สถานะปัจจุบัน

มี Express API สำหรับพื้นที่ การจอง การชำระเงิน ปฏิทินว่าง/ปิดห้อง ประวัติผู้ใช้ และ bearer-token login พร้อม role checks ฝั่งเซิร์ฟเวอร์ หน้าเว็บยังไม่ได้อยู่ใน workspace นี้ จึงยังต้องเชื่อม frontend เข้ากับ API ก่อนใช้งานครบวงจร

## เตรียมเครื่อง

- Node.js และ npm
- MySQL หรือ MariaDB (เช่น XAMPP)
- Git (กรณี clone จาก GitHub)

## ติดตั้ง

เปิด Terminal ที่โฟลเดอร์ `rent-space` ซึ่งมี `package.json` แล้วติดตั้งแพ็กเกจ:

```bash
npm install
```

สร้างไฟล์ `.env` จาก `.env.example` แล้วใส่ข้อมูล MySQL ของเครื่องตนเอง:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=rent_app
DB_PASSWORD=ใส่รหัสผ่าน MySQL ของคุณ
DB_NAME=rent_space
PORT=3000
```

อย่า commit หรือส่งไฟล์ `.env` ให้ผู้อื่น ไฟล์นี้ถูกละเว้นโดย `.gitignore` แล้ว

## สร้างฐานข้อมูล

เปิด MySQL ใน XAMPP แล้วสร้างฐานข้อมูลชื่อ `rent_space` ใน phpMyAdmin จากนั้นเลือกฐานข้อมูลและ import `database/rent_space.sql` หรือใช้ MySQL CLI:

```bash
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS rent_space CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;"
mysql -u root -p rent_space < database/rent_space.sql
```

อัปเดตฐานข้อมูลเดิมเพื่อเปิดใช้ session login และปฏิทินปิดห้อง:

```bash
mysql -u root -p rent_space < database/migrations/001_auth_and_room_blocks.sql
```

ถ้าต้องการข้อมูลตัวอย่างสำหรับพัฒนาหน้าจอ ให้ import `database/seed.sql` หลัง schema:

```bash
mysql -u root -p rent_space < database/seed.sql
```

บัญชี `rent_app` ต้องมีอยู่ใน MySQL และมีสิทธิ์กับฐานข้อมูล `rent_space` ก่อนนำไปใส่ใน `.env` ข้อมูลตัวอย่างใน `seed.sql` ใช้รหัสผ่าน placeholder จึงใช้เข้าสู่ระบบไม่ได้

บัญชีเก่าจาก schema dump ที่ใช้ SHA-256 ต้องตั้งรหัสผ่านใหม่ก่อนล็อกอิน ด้วยคำสั่ง `node scripts/set-password.js <username>` ใน terminal แบบ interactive. คำสั่งนี้รับรหัสผ่านแบบไม่แสดงบนจอและเพิกถอน session เก่าของบัญชีนั้น

## เริ่ม API

```bash
npm start
```

API จะทำงานที่ `http://localhost:3000` (หรือค่าจาก `PORT`) ดู endpoint และรูปแบบข้อมูลใน [API contract](docs/api-contract.md) โฟลเดอร์ frontend ยังไม่มีใน workspace นี้

## ตรวจการเชื่อมต่อฐานข้อมูล

```bash
npm run test:db
```

ถ้าสำเร็จจะแสดงชื่อฐานข้อมูล `rent_space` พร้อมตัวอย่างรายการที่อ่านได้

## เอกสาร

- [ERD และ data dictionary](docs/data-model.md)
- [API contract](docs/api-contract.md)
- [Schema dump](database/rent_space.sql)
- [Seed data](database/seed.sql)

## สรุป schema

- `users`: ลูกค้า เจ้าของพื้นที่ และผู้ดูแลระบบ
- `spaces`: รายการพื้นที่และสถานะการอนุมัติ
- `bookings`: คำขอจองที่เชื่อมลูกค้ากับพื้นที่
- `auth_sessions`: session token ที่เก็บเฉพาะค่า hash
- `room_blocks`: ช่วงวันที่เจ้าของหรือแอดมินปิดห้อง

บัญชีใหม่สมัครเป็นลูกค้าได้ที่ `POST /api/auth/register`; การกำหนดบัญชีเจ้าของและแอดมินทำโดยผู้ดูแลฐานข้อมูลเท่านั้น.

