const express = require('express');
const bcrypt = require('bcryptjs');
const { db } = require('../db');
const { sign, auth } = require('../auth');

const router = express.Router();

// 登录
router.post('/login', (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.json({ success: false, message: '请输入账号和密码' });
  }
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.json({ success: false, message: '账号或密码错误' });
  }
  if (user.status !== 'active') {
    return res.json({ success: false, message: '账号已被禁用' });
  }
  db.prepare('UPDATE users SET last_login = datetime(\'now\',\'localtime\') WHERE id = ?').run(user.id);
  const token = sign(user);
  res.json({
    success: true,
    token,
    user: { id: user.id, username: user.username, name: user.name, role: user.role }
  });
});

// 获取当前用户
router.get('/me', auth, (req, res) => {
  const user = db.prepare('SELECT id, username, name, role, phone FROM users WHERE id = ?').get(req.user.id);
  res.json({ success: true, user });
});

// 修改密码
router.post('/change-password', auth, (req, res) => {
  const { oldPassword, newPassword } = req.body || {};
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!bcrypt.compareSync(oldPassword || '', user.password)) {
    return res.json({ success: false, message: '原密码错误' });
  }
  db.prepare('UPDATE users SET password = ? WHERE id = ?').run(bcrypt.hashSync(newPassword, 10), req.user.id);
  res.json({ success: true, message: '密码修改成功' });
});

module.exports = router;
