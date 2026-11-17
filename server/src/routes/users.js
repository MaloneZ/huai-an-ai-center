const express = require('express');
const bcrypt = require('bcryptjs');
const { db } = require('../db');
const { auth, requireRole } = require('../auth');

const router = express.Router();

// 用户列表
router.get('/', auth, requireRole('admin'), (req, res) => {
  const list = db.prepare('SELECT id, username, name, role, phone, status, last_login, created_at FROM users ORDER BY id').all();
  res.json({ success: true, list });
});

// 新增用户
router.post('/', auth, requireRole('admin'), (req, res) => {
  const { username, password, name, role, phone } = req.body || {};
  if (!username || !password) return res.json({ success: false, message: '账号和密码不能为空' });
  const exist = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (exist) return res.json({ success: false, message: '账号已存在' });
  db.prepare('INSERT INTO users (username, password, name, role, phone) VALUES (?,?,?,?,?)')
    .run(username, bcrypt.hashSync(password, 10), name || username, role || 'operator', phone || '');
  res.json({ success: true });
});

// 更新用户
router.put('/:id', auth, requireRole('admin'), (req, res) => {
  const { name, role, phone, status, password } = req.body || {};
  const old = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!old) return res.json({ success: false, message: '用户不存在' });
  if (password) {
    db.prepare('UPDATE users SET name=?, role=?, phone=?, status=?, password=? WHERE id=?')
      .run(name ?? old.name, role ?? old.role, phone ?? old.phone, status ?? old.status, bcrypt.hashSync(password, 10), req.params.id);
  } else {
    db.prepare('UPDATE users SET name=?, role=?, phone=?, status=? WHERE id=?')
      .run(name ?? old.name, role ?? old.role, phone ?? old.phone, status ?? old.status, req.params.id);
  }
  res.json({ success: true });
});

// 删除用户
router.delete('/:id', auth, requireRole('admin'), (req, res) => {
  if (Number(req.params.id) === req.user.id) return res.json({ success: false, message: '不能删除自己' });
  db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// 设置获取
router.get('/settings/all', auth, (req, res) => {
  const rows = db.prepare('SELECT key, value FROM settings').all();
  const settings = {};
  rows.forEach(r => settings[r.key] = r.value);
  res.json({ success: true, settings });
});

// 设置保存
router.post('/settings', auth, requireRole('admin'), (req, res) => {
  const obj = req.body || {};
  const upsert = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value');
  Object.entries(obj).forEach(([k, v]) => upsert.run(k, String(v)));
  res.json({ success: true });
});

// AI 标签
router.get('/ai-tags/all', auth, (req, res) => {
  const list = db.prepare('SELECT * FROM ai_tags ORDER BY id').all();
  res.json({ success: true, list });
});

router.post('/ai-tags', auth, requireRole('admin', 'operator'), (req, res) => {
  const { name } = req.body || {};
  if (!name) return res.json({ success: false, message: '标签名不能为空' });
  db.prepare('INSERT OR IGNORE INTO ai_tags (name) VALUES (?)').run(name);
  res.json({ success: true });
});

router.delete('/ai-tags/:id', auth, requireRole('admin'), (req, res) => {
  db.prepare('DELETE FROM ai_tags WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
