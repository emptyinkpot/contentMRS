CREATE TABLE IF NOT EXISTS story_events (
  id INT PRIMARY KEY AUTO_INCREMENT,
  work_id INT NOT NULL,
  chapter_number INT NOT NULL,
  event_type VARCHAR(50) NOT NULL,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  characters_involved JSON,
  importance VARCHAR(20) DEFAULT 'medium',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_work_chapter (work_id, chapter_number),
  INDEX idx_importance (importance)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS character_growth (
  id INT PRIMARY KEY AUTO_INCREMENT,
  work_id INT NOT NULL,
  character_name VARCHAR(255) NOT NULL,
  chapter_number INT NOT NULL,
  growth_type VARCHAR(50) NOT NULL,
  before_change TEXT,
  after_change TEXT,
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_work_character (work_id, character_name),
  INDEX idx_chapter (chapter_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS important_items (
  id INT PRIMARY KEY AUTO_INCREMENT,
  work_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  item_type VARCHAR(50) NOT NULL,
  description TEXT,
  current_owner VARCHAR(255),
  acquired_at JSON,
  current_location VARCHAR(255),
  properties JSON,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_work_item_name (work_id, name),
  INDEX idx_work (work_id),
  INDEX idx_owner (current_owner)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
