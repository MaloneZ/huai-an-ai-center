const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'center.db');
const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');

// 确保目录存在
[DATA_DIR, UPLOAD_DIR, BACKUP_DIR].forEach(d => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// 初始化表结构
db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'operator', -- admin / operator / guest
  phone TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active',
  last_login TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS companies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  district TEXT DEFAULT '',
  name TEXT NOT NULL,
  main_business TEXT DEFAULT '',
  source TEXT DEFAULT '',
  visited INTEGER DEFAULT 0,
  address TEXT DEFAULT '',
  contact TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  visit_note TEXT DEFAULT '',
  is_ai INTEGER DEFAULT 0,
  ai_tags TEXT DEFAULT '[]',
  visit_time TEXT DEFAULT '',
  follow_up TEXT DEFAULT '',
  images TEXT DEFAULT '[]',
  created_at TEXT DEFAULT (datetime('now','localtime')),
  updated_at TEXT DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS exhibits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  type TEXT DEFAULT 'hw',          -- hw / sw
  category TEXT DEFAULT '展陈类',   -- 展陈类/资产类/消费品类/其他
  source_type TEXT DEFAULT '购买',  -- 租赁/购买
  purchase_amount REAL DEFAULT 0,
  rent_amount REAL DEFAULT 0,
  rent_expire TEXT DEFAULT '',
  warn_days INTEGER DEFAULT 7,
  ai_tags TEXT DEFAULT '[]',
  scene TEXT DEFAULT '',
  images TEXT DEFAULT '[]',
  status TEXT DEFAULT 'normal',
  created_at TEXT DEFAULT (datetime('now','localtime')),
  updated_at TEXT DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS visit_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id INTEGER NOT NULL,
  visit_date TEXT DEFAULT '',
  visitor TEXT DEFAULT '',
  result TEXT DEFAULT '',
  next_action TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now','localtime')),
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS ai_tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL
);
`);

// 默认设置
const defaultSettings = {
  renew_warn_days: '7',
  visit_follow_days: '30',
  notify_enabled: '1'
};
const insertSetting = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
Object.entries(defaultSettings).forEach(([k, v]) => insertSetting.run(k, v));

// 默认 AI 标签
const defaultTags = ['大模型', '计算机视觉', '自然语言处理', '智能硬件', '机器人', '数据标注', 'AI+教育', 'AI+医疗', 'AI+制造', 'AI+农业', '自动驾驶', '语音识别'];
const insertTag = db.prepare('INSERT OR IGNORE INTO ai_tags (name) VALUES (?)');
defaultTags.forEach(t => insertTag.run(t));

// 默认管理员账号 admin / admin123
const userCount = db.prepare('SELECT COUNT(*) AS c FROM users').get().c;
if (userCount === 0) {
  const hash = bcrypt.hashSync('admin123', 10);
  db.prepare('INSERT INTO users (username, password, name, role) VALUES (?, ?, ?, ?)')
    .run('admin', hash, '管理员', 'admin');
  db.prepare('INSERT INTO users (username, password, name, role) VALUES (?, ?, ?, ?)')
    .run('operator', bcrypt.hashSync('123456', 10), '张运营', 'operator');
}

module.exports = { db, DATA_DIR, DB_PATH, UPLOAD_DIR, BACKUP_DIR };
