const express = require('express');
const path = require('path');
const fs = require('fs');
const archiver = require('archiver');
const XLSX = require('xlsx');
const multer = require('multer');
const { db, DB_PATH, UPLOAD_DIR, BACKUP_DIR } = require('../db');
const { auth, requireRole } = require('../auth');

const router = express.Router();

// ===== 图片上传 =====
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, Date.now() + '-' + Math.round(Math.random() * 1e9) + ext);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (/^image\//.test(file.mimetype)) cb(null, true);
    else cb(new Error('仅支持图片文件'));
  }
});

router.post('/upload', auth, upload.single('file'), (req, res) => {
  if (!req.file) return res.json({ success: false, message: '上传失败' });
  res.json({ success: true, url: '/uploads/' + req.file.filename });
});

// 静态图片访问
router.get('/uploads/:name', (req, res) => {
  const p = path.join(UPLOAD_DIR, req.params.name);
  if (!fs.existsSync(p)) return res.status(404).end();
  res.sendFile(p);
});

// ===== 数据备份 =====
// 备份数据库 + 上传图片为一个 zip
router.post('/backup', auth, requireRole('admin'), async (req, res) => {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const zipName = `backup-${timestamp}.zip`;
    const zipPath = path.join(BACKUP_DIR, zipName);

    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    await new Promise((resolve, reject) => {
      output.on('close', resolve);
      archive.on('error', reject);
      archive.pipe(output);
      // 备份数据库
      archive.file(DB_PATH, { name: 'center.db' });
      // 备份上传图片
      if (fs.existsSync(UPLOAD_DIR)) {
        archive.directory(UPLOAD_DIR, 'uploads');
      }
      archive.finalize();
    });

    res.json({ success: true, filename: zipName, size: fs.statSync(zipPath).size });
  } catch (e) {
    res.json({ success: false, message: '备份失败: ' + e.message });
  }
});

// 备份列表
router.get('/backup/list', auth, requireRole('admin'), (req, res) => {
  const files = fs.readdirSync(BACKUP_DIR)
    .filter(f => f.endsWith('.zip'))
    .map(f => {
      const p = path.join(BACKUP_DIR, f);
      const st = fs.statSync(p);
      return { name: f, size: st.size, time: st.mtime };
    })
    .sort((a, b) => b.time - a.time);
  res.json({ success: true, list: files });
});

// 下载备份
router.get('/backup/download/:name', auth, requireRole('admin'), (req, res) => {
  const p = path.join(BACKUP_DIR, req.params.name);
  if (!fs.existsSync(p)) return res.status(404).end();
  res.download(p);
});

// 恢复备份
router.post('/backup/restore', auth, requireRole('admin'), async (req, res) => {
  const { name } = req.body || {};
  if (!name) return res.json({ success: false, message: '请选择备份文件' });
  const zipPath = path.join(BACKUP_DIR, name);
  if (!fs.existsSync(zipPath)) return res.json({ success: false, message: '备份文件不存在' });

  try {
    // 解压到临时目录
    const tmpDir = path.join(BACKUP_DIR, 'restore-tmp-' + Date.now());
    fs.mkdirSync(tmpDir, { recursive: true });
    const extract = require('child_process');
    // 使用 unzip 或 tar 解压（Windows 下用内置方式）
    // 用 PowerShell 解压
    const { execSync } = extract;
    try {
      execSync(`powershell -NoProfile -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${tmpDir}' -Force"`);
    } catch (e) {
      return res.json({ success: false, message: '解压失败: ' + e.message });
    }

    // 关闭数据库连接以便替换文件
    const dbPath = path.join(tmpDir, 'center.db');
    const uploadsTmp = path.join(tmpDir, 'uploads');
    if (!fs.existsSync(dbPath)) return res.json({ success: false, message: '备份文件缺少数据库' });

    // 先备份当前数据（恢复前自动备份，防止误操作）
    const safeTs = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const safePath = path.join(BACKUP_DIR, `pre-restore-${safeTs}.zip`);
    const output = fs.createWriteStream(safePath);
    const archive = archiver('zip', { zlib: { level: 9 } });
    await new Promise((resolve, reject) => {
      output.on('close', resolve);
      archive.on('error', reject);
      archive.pipe(output);
      archive.file(DB_PATH, { name: 'center.db' });
      if (fs.existsSync(UPLOAD_DIR)) archive.directory(UPLOAD_DIR, 'uploads');
      archive.finalize();
    });

    // 替换数据库
    db.close();
    fs.copyFileSync(dbPath, DB_PATH);
    // 替换图片目录
    if (fs.existsSync(uploadsTmp)) {
      fs.rmSync(UPLOAD_DIR, { recursive: true, force: true });
      fs.cpSync(uploadsTmp, UPLOAD_DIR, { recursive: true });
    }
    // 清理临时目录
    fs.rmSync(tmpDir, { recursive: true, force: true });

    res.json({ success: true, message: '恢复成功，服务将自动重启生效' });
  } catch (e) {
    res.json({ success: false, message: '恢复失败: ' + e.message });
  }
});

// 删除备份
router.delete('/backup/:name', auth, requireRole('admin'), (req, res) => {
  const p = path.join(BACKUP_DIR, req.params.name);
  if (fs.existsSync(p)) fs.unlinkSync(p);
  res.json({ success: true });
});

// ===== 数据导出 =====
// 导出企业 CSV
router.get('/export/companies', auth, (req, res) => {
  const list = db.prepare('SELECT * FROM companies ORDER BY id').all();
  const headers = ['序号', '县区', '企业名称', '主营范围', '名单来源', '是否已拜访', '地址', '联系人', '联系方式', '拜访情况', '是否AI相关', 'AI标签', '拜访时间'];
  const rows = list.map(c => [
    c.id, c.district, c.name, c.main_business, c.source,
    c.visited ? '已拜访' : '未拜访', c.address, c.contact, c.phone,
    c.visit_note, c.is_ai ? '是' : '否', JSON.parse(c.ai_tags || '[]').join('、'), c.visit_time
  ]);
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '企业列表');
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=companies.xlsx');
  res.send(buf);
});

// 导出展品 Excel
router.get('/export/exhibits', auth, (req, res) => {
  const list = db.prepare('SELECT * FROM exhibits ORDER BY id').all();
  const headers = ['序号', '展品名称', '产品类型', '分类', '获取方式', '购买金额', '租金/月', '租赁到期', '预警天数', 'AI标签', '应用场景'];
  const rows = list.map(e => [
    e.id, e.name, e.type === 'hw' ? '硬件产品' : '软件产品', e.category, e.source_type,
    e.purchase_amount, e.rent_amount, e.rent_expire, e.warn_days,
    JSON.parse(e.ai_tags || '[]').join('、'), e.scene
  ]);
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '展品列表');
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=exhibits.xlsx');
  res.send(buf);
});

// ===== 数据导入 =====
// 导入企业（Excel/CSV）
router.post('/import/companies', auth, requireRole('admin', 'operator'), upload.single('file'), (req, res) => {
  if (!req.file) return res.json({ success: false, message: '请上传文件' });
  try {
    const wb = XLSX.readFile(req.file.path);
    const ws = wb.Sheets[wb.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(ws, { defval: '' });
    let inserted = 0, failed = 0;
    const insert = db.prepare(`INSERT INTO companies
      (district, name, main_business, source, visited, address, contact, phone, visit_note, is_ai, ai_tags)
      VALUES (?,?,?,?,?,?,?,?,?,?,?)`);
    const tx = db.transaction(rows => {
      rows.forEach(r => {
        const name = r['企业名称'] || r['name'] || '';
        if (!name) { failed++; return; }
        const visitedVal = r['是否已拜访'] || r['visited'] || '';
        const aiVal = r['是否AI相关'] || r['is_ai'] || '';
        const tags = r['AI标签'] || r['ai_tags'] || '';
        insert.run(
          r['县区'] || r['district'] || '',
          name,
          r['主营范围'] || r['main_business'] || '',
          r['名单来源'] || r['source'] || '',
          (visitedVal === '已拜访' || visitedVal === '是' || visitedVal === 1 || visitedVal === '1') ? 1 : 0,
          r['地址'] || r['address'] || '',
          r['联系人'] || r['contact'] || '',
          String(r['联系方式'] || r['phone'] || ''),
          r['拜访情况'] || r['visit_note'] || '',
          (aiVal === '是' || aiVal === 1 || aiVal === '1') ? 1 : 0,
          JSON.stringify(tags ? String(tags).split(/[、,，]/).map(t => t.trim()).filter(Boolean) : [])
        );
        inserted++;
      });
    });
    tx(data);
    fs.unlinkSync(req.file.path);
    res.json({ success: true, inserted, failed });
  } catch (e) {
    res.json({ success: false, message: '导入失败: ' + e.message });
  }
});

// 导入展品
router.post('/import/exhibits', auth, requireRole('admin', 'operator'), upload.single('file'), (req, res) => {
  if (!req.file) return res.json({ success: false, message: '请上传文件' });
  try {
    const wb = XLSX.readFile(req.file.path);
    const ws = wb.Sheets[wb.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(ws, { defval: '' });
    let inserted = 0, failed = 0;
    const insert = db.prepare(`INSERT INTO exhibits
      (name, type, category, source_type, purchase_amount, rent_amount, rent_expire, warn_days, ai_tags, scene)
      VALUES (?,?,?,?,?,?,?,?,?,?)`);
    const tx = db.transaction(rows => {
      rows.forEach(r => {
        const name = r['展品名称'] || r['name'] || '';
        if (!name) { failed++; return; }
        const typeVal = r['产品类型'] || r['type'] || '硬件产品';
        const tags = r['AI标签'] || r['ai_tags'] || '';
        insert.run(
          name,
          (typeVal.includes('软件') || typeVal === 'sw') ? 'sw' : 'hw',
          r['分类'] || r['category'] || '展陈类',
          r['获取方式'] || r['source_type'] || '购买',
          Number(r['购买金额'] || r['purchase_amount'] || 0),
          Number(r['租金'] || r['rent_amount'] || 0),
          r['租赁到期'] || r['rent_expire'] || '',
          Number(r['预警天数'] || r['warn_days'] || 7),
          JSON.stringify(tags ? String(tags).split(/[、,，]/).map(t => t.trim()).filter(Boolean) : []),
          r['应用场景'] || r['scene'] || ''
        );
        inserted++;
      });
    });
    tx(data);
    fs.unlinkSync(req.file.path);
    res.json({ success: true, inserted, failed });
  } catch (e) {
    res.json({ success: false, message: '导入失败: ' + e.message });
  }
});

// 下载导入模板
router.get('/template/:type', auth, (req, res) => {
  const type = req.params.type;
  let headers, sample;
  if (type === 'companies') {
    headers = ['县区', '企业名称', '主营范围', '名单来源', '是否已拜访', '地址', '联系人', '联系方式', '拜访情况', '是否AI相关', 'AI标签'];
    sample = ['清江浦区', '示例科技有限公司', '人工智能软件研发', '政府推荐', '未拜访', '淮安市清江浦区XX路1号', '张三', '13800000000', '', '是', '大模型、计算机视觉'];
  } else {
    headers = ['展品名称', '产品类型', '分类', '获取方式', '购买金额', '租金', '租赁到期', '预警天数', 'AI标签', '应用场景'];
    sample = ['示例智能机器人', '硬件产品', '展陈类', '租赁', '', '1200', '2026-12-31', '7', '机器人、计算机视觉', '展馆迎宾引导演示'];
  }
  const ws = XLSX.utils.aoa_to_sheet([headers, sample]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '导入模板');
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename=${type}-template.xlsx`);
  res.send(buf);
});

module.exports = router;
