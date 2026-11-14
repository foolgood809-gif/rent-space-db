const test = require("node:test");
const assert = require("node:assert/strict");
const {
  parseCreateBookingInput,
  hasActiveBookingConflict,
  hasRoomBlockConflict,
  insertBooking,
} = require("../src/models/bookingModel");

const validInput = {
  space_id: 2014,
  start_date: "2026-12-10",
  start_time: "10:00",
  end_date: "2026-12-10",
  end_time: "12:00",
};

test("parses a valid same-day booking and normalizes times to database datetimes", () => {
  const parsed = parseCreateBookingInput(validInput);

  assert.deepEqual(parsed.value, {
    spaceId: 2014,
    startDate: "2026-12-10",
    startTime: "10:00",
    endDate: "2026-12-10",
    endTime: "12:00",
    startsAt: "2026-12-10 10:00:00",
    endsAt: "2026-12-10 12:00:00",
  });
});

test("rejects a missing request body", () => {
  assert.equal(parseCreateBookingInput(undefined).error, "กรุณาส่งข้อมูลการจองเป็น JSON object");
});

test("rejects impossible dates and out-of-range times", () => {
  assert.ok(parseCreateBookingInput({ ...validInput, start_date: "2026-02-30" }).error);
  assert.ok(parseCreateBookingInput({ ...validInput, start_time: "25:00" }).error);
});

test("rejects an end time equal to or earlier than the start time", () => {
  assert.equal(
    parseCreateBookingInput({ ...validInput, end_time: "10:00" }).error,
    "เวลาสิ้นสุดต้องอยู่หลังเวลาเริ่ม"
  );
  assert.equal(
    parseCreateBookingInput({ ...validInput, end_time: "09:59" }).error,
    "เวลาสิ้นสุดต้องอยู่หลังเวลาเริ่ม"
  );
});

test("checks active bookings using parameterized datetime overlap query", async () => {
  const calls = [];
  const executor = {
    async execute(sql, params) {
      calls.push({ sql, params });
      return [[{ booking_id: 77 }], []];
    },
  };

  const conflict = await hasActiveBookingConflict(executor, {
    spaceId: 2014,
    startDate: "2026-12-10",
    endDate: "2026-12-10",
    startsAt: "2026-12-10 10:00:00",
    endsAt: "2026-12-10 12:00:00",
  });

  assert.equal(conflict, true);
  assert.match(calls[0].sql, /start_time < \? AND end_time > \?/);
  assert.deepEqual(calls[0].params, [
    2014, "pending", "approved", "confirmed",
    "2026-12-10 12:00:00", "2026-12-10 10:00:00",
    "2026-12-10", "2026-12-10",
  ]);
});

test("checks room-block dates and reports whether a blocked range exists", async () => {
  const calls = [];
  const executor = {
    async execute(sql, params) {
      calls.push({ sql, params });
      return [[], []];
    },
  };

  const conflict = await hasRoomBlockConflict(executor, {
    spaceId: 2014,
    startDate: "2026-12-10",
    endDate: "2026-12-10",
  });

  assert.equal(conflict, false);
  assert.match(calls[0].sql, /FROM room_blocks/);
  assert.deepEqual(calls[0].params, [2014, "2026-12-10", "2026-12-10"]);
});

test("inserts booking dates and times as bound parameters with pending status", async () => {
  const calls = [];
  const executor = {
    async execute(sql, params) {
      calls.push({ sql, params });
      return [{ insertId: 3011 }, []];
    },
  };

  const result = await insertBooking(executor, {
    spaceId: 2014,
    customerId: 1002,
    startDate: "2026-12-10",
    endDate: "2026-12-10",
    startsAt: "2026-12-10 10:00:00",
    endsAt: "2026-12-10 12:00:00",
  });

  assert.equal(result.insertId, 3011);
  assert.match(calls[0].sql, /start_time, end_time, status/);
  assert.deepEqual(calls[0].params, [
    2014, 1002, "2026-12-10", "2026-12-10",
    "2026-12-10 10:00:00", "2026-12-10 12:00:00",
  ]);
});
