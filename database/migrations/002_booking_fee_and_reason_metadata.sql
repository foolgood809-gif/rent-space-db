USE rent_space;

-- Historical fee amounts are unknown, so existing rows remain NULL.
ALTER TABLE bookings
  ADD COLUMN platform_fee DECIMAL(10,2) DEFAULT NULL
    COMMENT 'Fee amount captured when the booking is created';

-- Keep optional UI metadata outside the core booking row. The fee is mirrored
-- here for clients that read booking_meta, while bookings.platform_fee remains
-- the canonical snapshot on the booking itself.
CREATE TABLE IF NOT EXISTS booking_meta (
  booking_id INT NOT NULL,
  platform_fee DECIMAL(10,2) DEFAULT NULL
    COMMENT 'Fee amount captured when the booking is created',
  reason_kind ENUM('canceledByUser','expiredBySystem') DEFAULT NULL,
  reason TEXT DEFAULT NULL,
  PRIMARY KEY (booking_id),
  CONSTRAINT fk_booking_meta_booking
    FOREIGN KEY (booking_id) REFERENCES bookings (booking_id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
