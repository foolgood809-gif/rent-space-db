const ACTIVE_BOOKING_STATUSES = ["pending", "approved", "confirmed"];

function isValidDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function isValidTime(value) {
  return typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(value);
}

function toDateTime(date, time) {
  return `${date} ${time.length === 5 ? `${time}:00` : time}`;
}

function parseCreateBookingInput(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { error: "กรุณาส่งข้อมูลการจองเป็น JSON object" };
  }

  const spaceId = Number(body.space_id);
  const { start_date: startDate, start_time: startTime, end_date: endDate, end_time: endTime } = body;
  if (!Number.isSafeInteger(spaceId) || spaceId < 1 ||
      !isValidDate(startDate) || !isValidDate(endDate) ||
      !isValidTime(startTime) || !isValidTime(endTime)) {
    return { error: "กรุณาส่ง space_id, วันที่ YYYY-MM-DD และเวลา HH:mm ให้ถูกต้อง" };
  }

  const startsAt = toDateTime(startDate, startTime);
  const endsAt = toDateTime(endDate, endTime);
  if (endsAt <= startsAt) {
    return { error: "เวลาสิ้นสุดต้องอยู่หลังเวลาเริ่ม" };
  }

  return { value: { spaceId, startDate, startTime, endDate, endTime, startsAt, endsAt } };
}

async function hasActiveBookingConflict(executor, { spaceId, startDate, endDate, startsAt, endsAt }) {
  const [rows] = await executor.execute(
    `SELECT booking_id FROM bookings
     WHERE space_id = ? AND status IN (?, ?, ?)
       AND (
         (start_time IS NOT NULL AND end_time IS NOT NULL AND start_time < ? AND end_time > ?)
         OR ((start_time IS NULL OR end_time IS NULL) AND start_date < ? AND end_date >= ?)
       )
     LIMIT 1`,
    [spaceId, ...ACTIVE_BOOKING_STATUSES, endsAt, startsAt, endDate, startDate]
  );
  return rows.length > 0;
}

async function hasRoomBlockConflict(executor, { spaceId, startDate, endDate }) {
  const [rows] = await executor.execute(
    "SELECT block_id FROM room_blocks WHERE space_id = ? AND start_date < ? AND end_date > ? LIMIT 1",
    [spaceId, endDate, startDate]
  );
  return rows.length > 0;
}

async function insertBooking(executor, { spaceId, customerId, startDate, endDate, startsAt, endsAt }) {
  const [result] = await executor.execute(
    `INSERT INTO bookings (space_id, customer_id, start_date, end_date, start_time, end_time, status)
     VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
    [spaceId, customerId, startDate, endDate, startsAt, endsAt]
  );
  return result;
}

module.exports = {
  isValidDate,
  parseCreateBookingInput,
  hasActiveBookingConflict,
  hasRoomBlockConflict,
  insertBooking,
};
