const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// 路由
app.use('/api/auth', require('./routes/auth'));
app.use('/api/companies', require('./routes/companies'));
app.use('/api/exhibits', require('./routes/exhibits'));
app.use('/api/stats', require('./routes/stats'));
app.use('/api/users', require('./routes/users'));
app.use('/api/data', require('./routes/data'));

// 健康检查
app.get('/api/health', (req, res) => res.json({ success: true, message: '服务正常' }));

// 生产环境托管前端
const distDir = path.join(__dirname, '..', '..', 'client', 'dist');
const fs = require('fs');
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distDir, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`✅ 淮安市人工智能集散中心管理平台后端已启动: http://localhost:${PORT}`);
  console.log(`   默认账号: admin / admin123`);
});
