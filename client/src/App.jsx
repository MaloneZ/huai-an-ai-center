import React, { useEffect, useState } from 'react'
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { Layout, Menu, Avatar, Dropdown, Badge, Button } from 'antd'
import {
  DashboardOutlined, BankOutlined, AppstoreOutlined, BarChartOutlined,
  TeamOutlined, SettingOutlined, DatabaseOutlined, LogoutOutlined,
  BellOutlined, UserOutlined,
} from '@ant-design/icons'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Companies from './pages/Companies'
import CompanyDetail from './pages/CompanyDetail'
import Exhibits from './pages/Exhibits'
import Analytics from './pages/Analytics'
import Users from './pages/Users'
import Settings from './pages/Settings'
import DataManage from './pages/DataManage'
import api from './api'

const { Sider, Header, Content } = Layout

const menuItems = [
  { key: '/dashboard', icon: <DashboardOutlined />, label: '首页看板' },
  { key: '/companies', icon: <BankOutlined />, label: '企业拜访' },
  { key: '/exhibits', icon: <AppstoreOutlined />, label: '展品管理' },
  { key: '/analytics', icon: <BarChartOutlined />, label: '运营分析' },
  { key: '/data', icon: <DatabaseOutlined />, label: '数据管理' },
  { key: '/users', icon: <TeamOutlined />, label: '账号管理' },
  { key: '/settings', icon: <SettingOutlined />, label: '系统设置' },
]

const crumbMap = {
  '/dashboard': '首页看板', '/companies': '企业拜访', '/exhibits': '展品管理',
  '/analytics': '运营分析', '/data': '数据管理', '/users': '账号管理', '/settings': '系统设置',
}

function LayoutShell({ children }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user') || '{}'))
  const [alertCount, setAlertCount] = useState(0)

  useEffect(() => {
    api.get('/stats/dashboard').then(res => {
      if (res.success) setAlertCount(res.alerts?.length || 0)
    }).catch(() => {})
  }, [])

  const selectedKey = '/' + (location.pathname.split('/')[1] || 'dashboard')
  const isDetail = location.pathname.startsWith('/companies/') && location.pathname !== '/companies'

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    navigate('/login')
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider theme="dark" width={220} style={{ background: 'linear-gradient(180deg,#0d2a5c,#142f63)' }}>
        <div style={{ padding: '20px 18px', color: '#fff', fontWeight: 700, fontSize: 15, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ width: 36, height: 36, borderRadius: 9, background: 'linear-gradient(135deg,#1B4B8F,#7C3AED)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>AI</span>
          <div>淮安 AI 集散中心<div style={{ fontSize: 11, fontWeight: 400, color: '#8aa0c0' }}>运营管理平台</div></div>
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[isDetail ? '/companies' : selectedKey]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          style={{ background: 'transparent', borderRight: 0, marginTop: 8 }}
        />
      </Sider>
      <Layout>
        <Header style={{ background: '#fff', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
          <div style={{ fontSize: 16, fontWeight: 600 }}>{isDetail ? '企业详情' : crumbMap[selectedKey] || ''}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <Badge count={alertCount} size="small">
              <BellOutlined style={{ fontSize: 18, cursor: 'pointer' }} onClick={() => navigate('/dashboard')} />
            </Badge>
            <Dropdown
              menu={{
                items: [
                  { key: 'pwd', icon: <UserOutlined />, label: '个人中心' },
                  { key: 'logout', icon: <LogoutOutlined />, label: '退出登录', onClick: logout },
                ],
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <Avatar style={{ background: 'linear-gradient(135deg,#2563EB,#7C3AED)' }}>{user.name?.[0] || '管'}</Avatar>
                <span>{user.name || '管理员'}</span>
              </div>
            </Dropdown>
          </div>
        </Header>
        <Content style={{ padding: 24 }}>{children}</Content>
      </Layout>
    </Layout>
  )
}

function ProtectedRoute({ children }) {
  const token = localStorage.getItem('token')
  if (!token) return <Navigate to="/login" replace />
  return <LayoutShell>{children}</LayoutShell>
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/companies" element={<ProtectedRoute><Companies /></ProtectedRoute>} />
      <Route path="/companies/:id" element={<ProtectedRoute><CompanyDetail /></ProtectedRoute>} />
      <Route path="/exhibits" element={<ProtectedRoute><Exhibits /></ProtectedRoute>} />
      <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
      <Route path="/data" element={<ProtectedRoute><DataManage /></ProtectedRoute>} />
      <Route path="/users" element={<ProtectedRoute><Users /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
