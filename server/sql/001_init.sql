CREATE TABLE IF NOT EXISTS users (
  id CHAR(36) NOT NULL PRIMARY KEY,
  username VARCHAR(48) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('user', 'admin') NOT NULL DEFAULT 'user',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY uk_users_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS profiles (
  id CHAR(36) NOT NULL PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  display_name VARCHAR(48) NOT NULL,
  accent CHAR(7) NOT NULL DEFAULT '#5f7d6d',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_profiles_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  KEY idx_profiles_user_updated (user_id, updated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS body_profiles (
  profile_id CHAR(36) NOT NULL PRIMARY KEY,
  height_cm DECIMAL(5,2) NOT NULL,
  weight_kg DECIMAL(6,2) NOT NULL,
  age TINYINT UNSIGNED NOT NULL,
  sex ENUM('male', 'female') NOT NULL,
  activity_level ENUM('sedentary', 'light', 'moderate', 'active', 'very_active') NOT NULL,
  goal ENUM('fat_loss', 'muscle_gain', 'maintenance') NOT NULL,
  target_weight_kg DECIMAL(6,2) NOT NULL,
  weekly_rate_kg DECIMAL(4,2) NOT NULL,
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_body_profiles_profile FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS food_catalog (
  id CHAR(36) NOT NULL PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  category VARCHAR(48) NOT NULL,
  calories_per_100g DECIMAL(8,2) NOT NULL,
  protein_per_100g DECIMAL(7,2) NOT NULL DEFAULT 0,
  carbs_per_100g DECIMAL(7,2) NOT NULL DEFAULT 0,
  fat_per_100g DECIMAL(7,2) NOT NULL DEFAULT 0,
  is_snack BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY uk_food_catalog_name (name),
  KEY idx_food_catalog_category (category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS meal_entries (
  id CHAR(36) NOT NULL PRIMARY KEY,
  profile_id CHAR(36) NOT NULL,
  entry_date DATE NOT NULL,
  meal_type ENUM('breakfast', 'lunch', 'dinner', 'snack') NOT NULL,
  source ENUM('manual', 'text', 'recipe', 'snack', 'photo') NOT NULL,
  name VARCHAR(120) NOT NULL,
  grams DECIMAL(7,2) NOT NULL,
  calories DECIMAL(8,2) NOT NULL,
  protein DECIMAL(7,2) NOT NULL DEFAULT 0,
  carbs DECIMAL(7,2) NOT NULL DEFAULT 0,
  fat DECIMAL(7,2) NOT NULL DEFAULT 0,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_meal_entries_profile FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE,
  KEY idx_meal_entries_profile_date (profile_id, entry_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS weight_logs (
  id CHAR(36) NOT NULL PRIMARY KEY,
  profile_id CHAR(36) NOT NULL,
  logged_on DATE NOT NULL,
  weight_kg DECIMAL(6,2) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_weight_logs_profile FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE,
  UNIQUE KEY uk_weight_logs_profile_date (profile_id, logged_on),
  KEY idx_weight_logs_profile_date (profile_id, logged_on)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS vision_keys (
  id CHAR(36) NOT NULL PRIMARY KEY,
  label VARCHAR(64) NOT NULL,
  api_key VARCHAR(255) NOT NULL,
  model VARCHAR(64) NOT NULL,
  base_url VARCHAR(255) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
