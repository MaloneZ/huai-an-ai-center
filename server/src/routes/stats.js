const express = require('express');
const { db } = require('../db');
const { auth } = require('../auth');

const router = express.Router();

// 看板统计
router.get('/dashboard', auth, (req, res) => {
  const total = db.prepare('SELECT COUNT(*) AS c FROM companies').get().c;
  const visited = db.prepare('SELECT COUNT(*) AS c FROM companies WHERE visited = 1').get().c;
  const aiCount = db.prepare('SELECT COUNT(*) AS c FROM companies WHERE is_ai = 1').get().c;
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const monthNew = db.prepare('SELECT COUNT(*) AS c FROM companies WHERE created_at >= ?').get(monthStart.toISOString()).c;

  const swCount = db.prepare('SELECT COUNT(*) AS c FROM exhibits WHERE type = ?').get('sw').c;
  const hwCount = db.prepare('SELECT COUNT(*) AS c FROM exhibits WHERE type = ?').get('hw').c;

  // 续租预警
  const exhibits = db.prepare('SELECT * FROM exhibits').all();
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const alerts = exhibits.filter(e => {
    if (e.source_type !== '租赁' || !e.rent_expire) return false;
    const diff = Math.ceil((new Date(e.rent_expire) - today) / (1000 * 60 * 60 * 24));
    return diff <= (e.warn_days || 7);
  }).map(e => ({
    id: e.id, name: e.name, type: e.type, category: e.category,
    rent_expire: e.rent_expire, warn_days: e.warn_days,
    days_left: Math.ceil((new Date(e.rent_expire) - today) / (1000 * 60 * 60 * 24)),
    kind: 'renew'
  }));

  // 跟进预警：未拜访的 AI 企业
  const followDays = Number(db.prepare('SELECT value FROM settings WHERE key = ?').get('visit_follow_days')?.value || 30);
  const followAlerts = db.prepare('SELECT id, name, district, created_at FROM companies WHERE visited = 0 AND is_ai = 1').all()
    .filter(c => {
      if (!c.created_at) return true;
      const diff = Math.ceil((today - new Date(c.created_at.replace(' ', 'T'))) / (1000 * 60 * 60 * 24));
      return diff >= followDays;
    })
    .map(c => ({ id: c.id, name: c.name, district: c.district, kind: 'follow' }));

  res.json({
    success: true,
    stats: { total, visited, aiCount, aiRate: total ? (aiCount / total * 100).toFixed(1) : 0, monthNew, swCount, hwCount },
    alerts: [...alerts, ...followAlerts]
  });
});

// 运营分析数据
router.get('/analytics', auth, (req, res) => {
  // 县区分布
  const districtRows = db.prepare('SELECT district, COUNT(*) AS c FROM companies GROUP BY district ORDER BY c DESC').all();
  // 标签统计
  const companies = db.prepare('SELECT ai_tags FROM companies WHERE is_ai = 1').all();
  const tagMap = {};
  companies.forEach(c => {
    try { JSON.parse(c.ai_tags).forEach(t => { tagMap[t] = (tagMap[t] || 0) + 1; }); } catch (e) {}
  });
  const tagRows = Object.entries(tagMap).sort((a, b) => b[1] - a[1]).map(([name, value]) => ({ name, value }));
  // 展品结构
  const exhibitRows = db.prepare('SELECT type, category, COUNT(*) AS c FROM exhibits GROUP BY type, category').all();

  res.json({ success: true, districtRows, tagRows, exhibitRows });
});

module.exports = router;
