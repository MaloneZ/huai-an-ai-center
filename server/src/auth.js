const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET || 'huai-an-ai-center-secret-key';

function sign(user) {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role, name: user.name },
    SECRET,
    { expiresIn: '7d' }
  );
}

function verify(token) {
  try {
    return jwt.verify(token, SECRET);
  } catch (e) {
    return null;
  }
}

// 认证中间件
function auth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  const payload = verify(token);
  if (!payload) {
    return res.status(401).json({ success: false, message: '未登录或登录已过期' });
  }
  req.user = payload;
  next();
}

// 角色校验中间件
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: '无权限执行此操作' });
    }
    next();
  };
}

module.exports = { sign, verify, auth, requireRole, SECRET };
