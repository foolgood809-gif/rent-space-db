# RentSpace API contract

Base URL: `http://localhost:3000/api`. Requests and responses use JSON. Dates use `YYYY-MM-DD`. Errors use `{ "error": "..." }`.

Protected endpoints require `Authorization: Bearer <token>` from `/auth/login`. The server stores only a hash of each random session token, expires sessions after seven days, and checks the current user and role on every request. Use HTTPS when deployed. Frontend code must never decide admin access on its own.

## Authentication

| Method and path | Request | Success |
|---|---|---|
| `POST /auth/register` | `{ name, username, email, password }` | `201`: customer account created; password must be at least 10 characters. |
| `POST /auth/login` | `{ login, password }` | `200`: bearer token, expiry and user profile. `login` accepts username or email. |
| `GET /auth/me` | Bearer token | `200`: current user profile. |
| `POST /auth/logout` | Bearer token | `200`: revokes the current session. |

Registration creates customer accounts only. Promote owner/admin accounts through a trusted database operation. New passwords use scrypt. Accounts with legacy SHA-256 password hashes must be reset from the server terminal with `node scripts/set-password.js <username>` before they can sign in; weak legacy hashes are not accepted.

## Spaces and availability

| Method and path | Request | Success |
|---|---|---|
| `GET /spaces` | — | `200`: spaces with status and listing details. |
| `GET /spaces/:spaceId/availability?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD` | — | `200`: overlapping active bookings and room blocks for that date window. |
| `POST /spaces` | Owner bearer token; `{ title, description?, location, price_per_day }` | `201`: new space starts `pending`; owner ID comes from the session. |
| `PATCH /spaces/:spaceId/status` | Admin bearer token; `{ status: "pending" | "approved" | "rejected" }` | `200`: updated space. |
| `DELETE /spaces/:spaceId` | Owning user or admin bearer token | `200`; `409` if bookings still reference it. |
| `POST /spaces/:spaceId/blocks` | Owner/admin bearer token; `{ start_date, end_date, reason? }` | `201`: creates an unavailable date range; rejected if it overlaps an active booking. |
| `DELETE /spaces/:spaceId/blocks/:blockId` | Owner/admin bearer token | `200`: removes the room block. |

Dates are real calendar dates and `end_date` must be later than `start_date`. Ranges use half-open overlap logic (`start < other_end` and `end > other_start`).

## Bookings and history

| Method and path | Request | Success |
|---|---|---|
| `GET /bookings` | Bearer token | Customer sees own bookings; owner sees bookings for their spaces; admin sees all. |
| `GET /bookings/history` | Bearer token | Same role-based scope, with payment summary. |
| `POST /bookings` | Customer bearer token; `{ space_id, start_date, start_time, end_date, end_time }`; dates use `YYYY-MM-DD`, times use `HH:mm` (24-hour) | `201`: starts `pending`; customer ID comes from the session. `start_time` and `end_time` are stored as full datetimes. |
| `PATCH /bookings/:bookingId/status` | Admin bearer token; `{ status: "approved" | "rejected" | "cancelled" }` | `200`: updated booking. |
| `DELETE /bookings/:bookingId` | Customer/owner of record or admin bearer token | `200`; approved bookings must first be cancelled. |

Only approved spaces can be booked. Pending, approved or confirmed bookings prevent overlapping time ranges; older bookings without time values block their full date range. Room blocks prevent booking on blocked dates. Conflicts return `409`.

Status transitions: `pending` → `approved`, `rejected` or `cancelled`; `approved` → `cancelled`; rejected/cancelled are final.

## Payments

| Method and path | Request | Success |
|---|---|---|
| `GET /payments?booking_id=:id` | Bearer token; optional booking filter | `200`: customer sees own payments, owner sees payments for own spaces, admin sees all. |
| `POST /payments` | Customer bearer token; `{ booking_id, amount, payment_method, transaction_ref?, slip_image_url? }` | `201`: allowed only for the signed-in customer's booking. |
| `PATCH /payments/:paymentId/status` | Admin bearer token; `{ status: "submitted" | "verified" | "rejected" | "refunded" }` | `200`: updated payment. |

Payment status transitions are `pending` → `submitted` → `verified` or `rejected`; `rejected` → `submitted`; `verified` → `refunded`.

## Reviews and amenities

| Method and path | Request | Success |
|---|---|---|
| `GET /reviews` | — | `200`: reviews with booking, space and customer details. |
| `POST /reviews` | Customer bearer token; `{ booking_id, rating, review_comment? }` | `201`: one review per booking, rating 1–5, for own booking only. |
| `GET /amenities` | — | `200`: amenity catalog. |
| `POST /amenities` | Admin bearer token; `{ name, description?, icon? }` | `201`: new amenity. |
| `PUT /spaces/:spaceId/amenities` | Admin bearer token; `{ amenity_ids: [1, 2] }` | `200`: replaces amenity assignments. |
| `GET /admin/logs` | Admin bearer token | `200`: latest 200 audit entries. |

Admin changes to spaces/bookings, payment status, amenities and amenity assignments are written to `admin_logs`.

## Setup and remaining API work

After importing `database/rent_space.sql`, apply `database/migrations/001_auth_and_room_blocks.sql`. Pagination, image upload and total-price calculation are not implemented. The frontend is outside this backend workspace and must be updated to call these APIs and send bearer tokens.
