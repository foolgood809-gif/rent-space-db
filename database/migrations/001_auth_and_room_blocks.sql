USE rent_space;

CREATE TABLE IF NOT EXISTS auth_sessions (
  session_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id INT NOT NULL,
  token_hash CHAR(64) NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (session_id),
  UNIQUE KEY uq_auth_sessions_token_hash (token_hash),
  KEY idx_auth_sessions_user_expiry (user_id, expires_at),
  CONSTRAINT fk_auth_sessions_user FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS room_blocks (
  block_id INT NOT NULL AUTO_INCREMENT,
  space_id INT NOT NULL,
  created_by INT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason VARCHAR(255) DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (block_id),
  KEY idx_room_blocks_space_dates (space_id, start_date, end_date),
  CONSTRAINT fk_room_blocks_space FOREIGN KEY (space_id) REFERENCES spaces (space_id) ON DELETE CASCADE,
  CONSTRAINT fk_room_blocks_user FOREIGN KEY (created_by) REFERENCES users (user_id),
  CONSTRAINT chk_room_blocks_dates CHECK (end_date > start_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
