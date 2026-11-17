const express = require('express');
const { db } = require('../db');
const { auth, requireRole } = require('../auth');

const router = express.Router();

// 计算展品状态
function calcStatus(e) {
  if (e.source_type !== '租赁' || !e.rent_expire) return 'normal';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expire = new Date(e.rent_expire);
  const diff = Math.ceil((expire - today) / (1000 * 60 * 60 * 24));
  if (diff < 0) return 'expired';
  if (diff <= (e.warn_days || 7)) return 'soon';
  return 'normal';
}

// 列表
router.get('/', auth, (req, res) => {
  const { type, category, status } = req.query;
  const conditions = [];
  const params = [];
  if (type) { conditions.push('type = ?'); params.push(type); }
  if (category) { conditions.push('category = ?'); params.push(category); }
  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
  let list = db.prepare(`SELECT * FROM exhibits ${where} ORDER BY id DESC`).all(...params);
  list = list.map(e => ({ ...e, status: calcStatus(e) }));
  if (status) list = list.filter(e => e.status === status);
  res.json({ success: true, list });
});

// 详情
router.get('/:id', auth, (req, res) => {
  const e = db.prepare('SELECT * FROM exhibits WHERE id = ?').get(req.params.id);
  if (!e) return res.json({ success: false, message: '展品不存在' });
  e.status = calcStatus(e);
  res.json({ success: true, exhibit: e });
});

// 新增
router.post('/', auth, requireRole('admin', 'operator'), (req, res) => {
  const c = req.body || {};
  const info = db.prepare(`INSERT INTO exhibits
    (name, type, category, source_type, purchase_amount, rent_amount, rent_expire, warn_days, ai_tags, scene, images)
    VALUES (?,?,?,?,?,?,?,?,?,?,?)`)
    .run(c.name || '', c.type || 'hw', c.category || '展陈类', c.source_type || '购买',
      c.purchase_amount || 0, c.rent_amount || 0, c.rent_expire || '', c.warn_days || 7,
      JSON.stringify(c.ai_tags || []), c.scene || '', JSON.stringify(c.images || []));
  res.json({ success: true, id: info.lastInsertRowid });
});

// 更新
router.put('/:id', auth, requireRole('admin', 'operator'), (req, res) => {
  const c = req.body || {};
  const old = db.prepare('SELECT * FROM exhibits WHERE id = ?').get(req.params.id);
  if (!old) return res.json({ success: false, message: '展品不存在' });
  db.prepare(`UPDATE exhibits SET
    name=?, type=?, category=?, source_type=?, purchase_amount=?, rent_amount=?, rent_expire=?,
    warn_days=?, ai_tags=?, scene=?, images=?, updated_at=datetime('now','localtime')
    WHERE id=?`)
    .run(c.name ?? old.name, c.type ?? old.type, c.category ?? old.category,
      c.source_type ?? old.source_type, c.purchase_amount ?? old.purchase_amount,
      c.rent_amount ?? old.rent_amount, c.rent_expire ?? old.rent_expire,
      c.warn_days ?? old.warn_days, JSON.stringify(c.ai_tags ?? JSON.parse(old.ai_tags)),
      c.scene ?? old.scene, JSON.stringify(c.images ?? JSON.parse(old.images)), req.params.id);
  res.json({ success: true });
});

// 删除
router.delete('/:id', auth, requireRole('admin'), (req, res) => {
  db.prepare('DELETE FROM exhibits WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
