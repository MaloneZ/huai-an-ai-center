import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Form, Input, Button, message } from 'antd'
import { UserOutlined, LockOutlined } from '@ant-design/icons'
import api from '../api'

export default function Login() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)

  const onFinish = async (values) => {
    setLoading(true)
    try {
      const res = await api.post('/auth/login', values)
      if (res.success) {
        localStorage.setItem('token', res.token)
        localStorage.setItem('user', JSON.stringify(res.user))
        message.success('登录成功')
        navigate('/dashboard')
      } else {
        message.error(res.message)
      }
    } catch (e) {
      message.error('登录失败，请检查服务是否启动')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg,#0d2a5c 0%,#1B4B8F 55%,#2563EB 100%)', position: 'relative', overflow: 'hidden'
    }}>
      <div style={{ position: 'absolute', width: 600, height: 600, borderRadius: '50%', background: 'rgba(124,58,237,.18)', top: -200, right: -150 }} />
      <div style={{ position: 'absolute', width: 400, height: 400, borderRadius: '50%', background: 'rgba(37,99,235,.22)', bottom: -180, left: -120 }} />
      <div style={{ position: 'relative', zIndex: 2, width: 420, background: '#fff', borderRadius: 16, padding: '40px 36px', boxShadow: '0 24px 60px rgba(0,0,0,.35)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <div style={{ width: 42, height: 42, borderRadius: 10, background: 'linear-gradient(135deg,#1B4B8F,#7C3AED)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 20 }}>AI</div>
          <div>
            <h1 style={{ fontSize: 20, margin: 0 }}>淮安市人工智能集散中心</h1>
            <div style={{ color: '#6b7280', fontSize: 13 }}>运营管理平台 · 展馆运营一体化</div>
          </div>
        </div>
        <Form onFinish={onFinish} style={{ marginTop: 24 }} size="large">
          <Form.Item name="username" rules={[{ required: true, message: '请输入账号' }]}>
            <Input prefix={<UserOutlined />} placeholder="账号" />
          </Form.Item>
          <Form.Item name="password" rules={[{ required: true, message: '请输入密码' }]}>
            <Input.Password prefix={<LockOutlined />} placeholder="密码" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block loading={loading}>登 录</Button>
          </Form.Item>
        </Form>
        <div style={{ color: '#9ca3af', fontSize: 12, textAlign: 'center' }}>默认账号 admin / admin123（或 operator / 123456）</div>
      </div>
    </div>
  )
}
