import mysql, { type RowDataPacket } from "mysql2/promise";
import { config } from "./config.js";
import { FOOD_CATALOG } from "./food-catalog.js";

export const database = mysql.createPool({
  host: config.DATABASE_HOST,
  port: config.DATABASE_PORT,
  database: config.DATABASE_NAME,
  user: config.DATABASE_USER,
  password: config.DATABASE_PASSWORD,
  waitForConnections: true,
  connectionLimit: 10,
  timezone: "Z",
  decimalNumbers: true,
});

export async function initializeDatabase() {
  await database.query(`CREATE TABLE IF NOT EXISTS weight_logs (
    id CHAR(36) NOT NULL PRIMARY KEY,
    profile_id CHAR(36) NOT NULL,
    logged_on DATE NOT NULL,
    weight_kg DECIMAL(6,2) NOT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    CONSTRAINT fk_weight_logs_profile FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE,
    UNIQUE KEY uk_weight_logs_profile_date (profile_id, logged_on),
    KEY idx_weight_logs_profile_date (profile_id, logged_on)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`);
  await database.query(`CREATE TABLE IF NOT EXISTS food_catalog (
    id CHAR(36) NOT NULL PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    category VARCHAR(48) NOT NULL,
    calories_per_100g DECIMAL(8,2) NOT NULL,
    protein_per_100g DECIMAL(7,2) NOT NULL DEFAULT 0,
    carbs_per_100g DECIMAL(7,2) NOT NULL DEFAULT 0,
    fat_per_100g DECIMAL(7,2) NOT NULL DEFAULT 0,
    is_snack BOOLEAN NOT NULL DEFAULT FALSE,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    UNIQUE KEY uk_food_catalog_name (name),
    KEY idx_food_catalog_category (category)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`);
  for (const food of FOOD_CATALOG) {
    await database.execute(
      `INSERT INTO food_catalog (id, name, category, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, is_snack)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE name = VALUES(name), category = VALUES(category), calories_per_100g = VALUES(calories_per_100g), protein_per_100g = VALUES(protein_per_100g), carbs_per_100g = VALUES(carbs_per_100g), fat_per_100g = VALUES(fat_per_100g), is_snack = VALUES(is_snack)`,
      [food.id, food.name, food.category, food.caloriesPer100g, food.proteinPer100g, food.carbsPer100g, food.fatPer100g, food.isSnack],
    );
  }
  await database.query(`CREATE TABLE IF NOT EXISTS user_foods (
    id CHAR(36) NOT NULL PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    name VARCHAR(120) NOT NULL,
    calories_per_100g DECIMAL(8,2) NOT NULL,
    protein_per_100g DECIMAL(7,2) NOT NULL DEFAULT 0,
    carbs_per_100g DECIMAL(7,2) NOT NULL DEFAULT 0,
    fat_per_100g DECIMAL(7,2) NOT NULL DEFAULT 0,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    UNIQUE KEY uk_user_foods_name (user_id, name),
    CONSTRAINT fk_user_foods_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`);
  await migrateMealEntriesSource();
  await migrateBodyProfileOverrides();
}

async function migrateBodyProfileOverrides() {
  const [tables] = await database.query<RowDataPacket[]>(
    "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'body_profiles'",
  );
  if (!tables[0]) return;
  const columns = [
    { name: "manual_tdee", ddl: "DECIMAL(7,0) NULL" },
    { name: "manual_target_calories", ddl: "DECIMAL(7,0) NULL" },
    { name: "manual_protein", ddl: "DECIMAL(6,1) NULL" },
    { name: "manual_carbs", ddl: "DECIMAL(6,1) NULL" },
    { name: "manual_fat", ddl: "DECIMAL(6,1) NULL" },
  ];
  const [rows] = await database.query<RowDataPacket[]>(
    "SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'body_profiles'",
  );
  const existing = new Set(rows.map((row) => String(row.COLUMN_NAME)));
  for (const column of columns) {
    if (!existing.has(column.name)) {
      await database.query(`ALTER TABLE body_profiles ADD COLUMN ${column.name} ${column.ddl}`);
    }
  }
}

async function migrateMealEntriesSource() {
  const [tables] = await database.query<RowDataPacket[]>(
    "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'meal_entries'",
  );
  if (!tables[0]) return;
  await database.query(
    "ALTER TABLE meal_entries MODIFY COLUMN source ENUM('manual','text','recipe','snack','photo') NOT NULL",
  );
}
