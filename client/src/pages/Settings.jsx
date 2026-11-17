import React, { useEffect, useState } from 'react'
import { Card, Form, InputNumber, Switch, Button, message, Tag, Input, Space, List, Popconfirm } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import api from '../api'

export default function Settings() {
  const [settings, setSettings] = useState({})
  const [tags, setTags] = useState([])
  const [newTag, setNewTag] = useState('')

  useEffect(() => {
    api.get('/users/settings/all').then(res => { if (res.success) setSettings(res.settings) })
    api.get('/users/ai-tags/all').then(res => { if (res.success) setTags(res.list) })
  }, [])

  const saveSettings = async (values) => {
    const res = await api.post('/users/settings', {
      renew_warn_days: values.renew_warn_days ?? settings.renew_warn_days,
      visit_follow_days: values.visit_follow_days ?? settings.visit_follow_days,
      notify_enabled: values.notify_enabled ? '1' : '0',
    })
    if (res.success) message.success('设置已保存')
  }

  const addTag = async () => {
    if (!newTag.trim()) return
    const res = await api.post('/users/ai-tags', { name: newTag.trim() })
    if (res.success) {
      message.success('标签已添加')
      setNewTag('')
      api.get('/users/ai-tags/all').then(r => { if (r.success) setTags(r.list) })
    }
  }

  const deleteTag = async (id) => {
    const res = await api.delete(`/users/ai-tags/${id}`)
    if (res.success) { message.success('已删除'); api.get('/users/ai-tags/all').then(r => { if (r.success) setTags(r.list) }) }
  }

  return (
    <div>
      <Card title="预警阈值配置" style={{ marginBottom: 16 }}>
        <Form
          layout="horizontal"
          labelCol={{ span: 8 }}
          wrapperCol={{ span: 10 }}
          initialValues={{ renew_warn_days: Number(settings.renew_warn_days || 7), visit_follow_days: Number(settings.visit_follow_days || 30), notify_enabled: settings.notify_enabled === '1' }}
          onFinish={saveSettings}
        >
          <Form.Item name="renew_warn_days" label="续租预警期限（天）" extra="展品租赁到期前提前提醒的天数">
            <InputNumber min={1} style={{ width: 200 }} />
          </Form.Item>
          <Form.Item name="visit_follow_days" label="拜访跟进预警（天）" extra="未拜访的 AI 相关企业超 N 天自动提醒">
            <InputNumber min={1} style={{ width: 200 }} />
          </Form.Item>
          <Form.Item name="notify_enabled" label="通知提醒开关" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item wrapperCol={{ offset: 8 }}>
            <Button type="primary" htmlType="submit">保存设置</Button>
          </Form.Item>
        </Form>
      </Card>

      <Card title="AI 技术标签字典">
        <Space style={{ marginBottom: 16 }}>
          <Input placeholder="输入新标签名" style={{ width: 200 }} value={newTag} onChange={e => setNewTag(e.target.value)} onPressEnter={addTag} />
          <Button type="primary" icon={<PlusOutlined />} onClick={addTag}>添加标签</Button>
        </Space>
        <div>
          {tags.map(t => (
            <Tag key={t.id} color="geekblue" closable onClose={(e) => { e.preventDefault(); deleteTag(t.id) }} style={{ marginBottom: 8, fontSize: 13 }}>
              {t.name}
            </Tag>
          ))}
        </div>
      </Card>
    </div>
  )
}
