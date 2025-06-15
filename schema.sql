CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    login TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    is_admin BOOLEAN DEFAULT 0
);

CREATE TABLE user_profiles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    gender TEXT,
    age INTEGER,
    weight INTEGER,
    height INTEGER,
    activity_level TEXT,
    goals TEXT,
    workout_plan TEXT,
    diet_plan TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE health_data (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    date DATE NOT NULL,
    steps INTEGER DEFAULT 0,
    distance REAL DEFAULT 0,
    calories_burned INTEGER DEFAULT 0,
    water_intake INTEGER DEFAULT 0,
    calories_consumed INTEGER DEFAULT 0,
    activities TEXT,
    foods TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Insert admin user
INSERT INTO users (login, password, is_admin) VALUES ('admin', 'admin', 1);