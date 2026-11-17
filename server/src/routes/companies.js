const express = require('express');
const { db } = require('../db');
const { auth, requireRole } = require('../auth');

const router = express.Router();

// 列表（支持筛选、搜索、分页）
router.get('/', auth, (req, res) => {
  const { keyword, district, is_ai, visited, source, page = 1, pageSize = 50 } = req.query;
  const conditions = [];
  const params = [];
  if (keyword) { conditions.push('(name LIKE ? OR contact LIKE ? OR phone LIKE ?)'); params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`); }
  if (district) { conditions.push('district = ?'); params.push(district); }
  if (is_ai !== undefined && is_ai !== '') { conditions.push('is_ai = ?'); params.push(is_ai); }
  if (visited !== undefined && visited !== '') { conditions.push('visited = ?'); params.push(visited); }
  if (source) { conditions.push('source = ?'); params.push(source); }
  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

  const total = db.prepare(`SELECT COUNT(*) AS c FROM companies ${where}`).get(...params).c;
  const list = db.prepare(`SELECT * FROM companies ${where} ORDER BY id DESC LIMIT ? OFFSET ?`)
    .all(...params, Number(pageSize), (Number(page) - 1) * Number(pageSize));

  res.json({ success: true, list, total });
});

// 详情
router.get('/:id', auth, (req, res) => {
  const company = db.prepare('SELECT * FROM companies WHERE id = ?').get(req.params.id);
  if (!company) return res.json({ success: false, message: '企业不存在' });
  const records = db.prepare('SELECT * FROM visit_records WHERE company_id = ? ORDER BY visit_date DESC').all(req.params.id);
  res.json({ success: true, company, records });
});

// 新增
router.post('/', auth, requireRole('admin', 'operator'), (req, res) => {
  const c = req.body || {};
  const info = db.prepare(`INSERT INTO companies
    (district, name, main_business, source, visited, address, contact, phone, visit_note, is_ai, ai_tags, visit_time, follow_up, images)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
    .run(c.district || '', c.name || '', c.main_business || '', c.source || '', c.visited ? 1 : 0,
      c.address || '', c.contact || '', c.phone || '', c.visit_note || '', c.is_ai ? 1 : 0,
      JSON.stringify(c.ai_tags || []), c.visit_time || '', c.follow_up || '', JSON.stringify(c.images || []));
  res.json({ success: true, id: info.lastInsertRowid });
});

// 更新
router.put('/:id', auth, requireRole('admin', 'operator'), (req, res) => {
  const c = req.body || {};
  const old = db.prepare('SELECT * FROM companies WHERE id = ?').get(req.params.id);
  if (!old) return res.json({ success: false, message: '企业不存在' });
  db.prepare(`UPDATE companies SET
    district=?, name=?, main_business=?, source=?, visited=?, address=?, contact=?, phone=?,
    visit_note=?, is_ai=?, ai_tags=?, visit_time=?, follow_up=?, images=?, updated_at=datetime('now','localtime')
    WHERE id=?`)
    .run(c.district ?? old.district, c.name ?? old.name, c.main_business ?? old.main_business,
      c.source ?? old.source, c.visited ?? old.visited, c.address ?? old.address,
      c.contact ?? old.contact, c.phone ?? old.phone, c.visit_note ?? old.visit_note,
      c.is_ai ?? old.is_ai, JSON.stringify(c.ai_tags ?? JSON.parse(old.ai_tags)),
      c.visit_time ?? old.visit_time, c.follow_up ?? old.follow_up,
      JSON.stringify(c.images ?? JSON.parse(old.images)), req.params.id);
  res.json({ success: true });
});

// 删除
router.delete('/:id', auth, requireRole('admin'), (req, res) => {
  db.prepare('DELETE FROM companies WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// 批量删除
router.post('/batch-delete', auth, requireRole('admin'), (req, res) => {
  const { ids } = req.body || {};
  if (!Array.isArray(ids) || !ids.length) return res.json({ success: false, message: '请选择要删除的数据' });
  const del = db.prepare('DELETE FROM companies WHERE id = ?');
  const tx = db.transaction(ids => ids.forEach(id => del.run(id)));
  tx(ids);
  res.json({ success: true });
});

// 新增拜访记录
router.post('/:id/visit-record', auth, requireRole('admin', 'operator'), (req, res) => {
  const { visit_date, visitor, result, next_action } = req.body || {};
  db.prepare('INSERT INTO visit_records (company_id, visit_date, visitor, result, next_action) VALUES (?,?,?,?,?)')
    .run(req.params.id, visit_date || '', visitor || '', result || '', next_action || '');
  db.prepare('UPDATE companies SET visited = 1, visit_time = ?, updated_at = datetime(\'now\',\'localtime\') WHERE id = ?')
    .run(visit_date || '', req.params.id);
  res.json({ success: true });
});

module.exports = router;
