import React, { useEffect, useState } from 'react'
import { Card, Table, Button, Tag, Modal, Form, Input, Select, message, Space, Popconfirm } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import api from '../api'

const ROLE_MAP = {
  admin: { text: '超级管理员', color: 'purple' },
  operator: { text: '运营专员', color: 'blue' },
  guest: { text: '访客(只读)', color: 'default' },
}

export default function Users() {
  const [list, setList] = useState([])
  const [open, setOpen] = useState(false)
  const [form] = Form.useForm()

  const fetchData = () => api.get('/users').then(res => { if (res.success) setList(res.list) })
  useEffect(() => { fetchData() }, [])

  const onAdd = async (values) => {
    const res = await api.post('/users', values)
    if (res.success) { message.success('账号创建成功'); setOpen(false); form.resetFields(); fetchData() }
    else message.error(res.message)
  }

  const onDelete = async (id) => {
    const res = await api.delete(`/users/${id}`)
    if (res.success) { message.success('已删除'); fetchData() }
    else message.error(res.message)
  }

  const toggleStatus = async (record) => {
    const newStatus = record.status === 'active' ? 'disabled' : 'active'
    const res = await api.put(`/users/${record.id}`, { status: newStatus })
    if (res.success) { message.success(newStatus === 'active' ? '已启用' : '已禁用'); fetchData() }
  }

  const columns = [
    { title: '账号', dataIndex: 'username' },
    { title: '姓名', dataIndex: 'name' },
    { title: '角色', dataIndex: 'role', render: v => <Tag color={ROLE_MAP[v]?.color}>{ROLE_MAP[v]?.text || v}</Tag> },
    { title: '手机号', dataIndex: 'phone', render: v => v || '—' },
    { title: '状态', dataIndex: 'status', render: v => v === 'active' ? <Tag color="green">正常</Tag> : <Tag color="red">禁用</Tag> },
    { title: '最近登录', dataIndex: 'last_login', render: v => v || '—' },
    {
      title: '操作', render: (_, r) => (
        <Space>
          <a onClick={() => toggleStatus(r)}>{r.status === 'active' ? '禁用' : '启用'}</a>
          <Popconfirm title="确定删除此账号？" onConfirm={() => onDelete(r.id)}>
            <a style={{ color: '#DC2626' }}>删除</a>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div>
      <Card title="系统账号" extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>新建账号</Button>}>
        <Table rowKey="id" columns={columns} dataSource={list} pagination={false} />
      </Card>

      <Modal title="新建账号" open={open} onCancel={() => setOpen(false)} onOk={() => form.submit()} destroyOnClose>
        <Form form={form} layout="vertical" onFinish={onAdd} initialValues={{ role: 'operator' }}>
          <Form.Item name="username" label="账号" rules={[{ required: true, message: '请输入账号' }]}><Input /></Form.Item>
          <Form.Item name="password" label="初始密码" rules={[{ required: true, message: '请输入密码' }]}><Input.Password /></Form.Item>
          <Form.Item name="name" label="姓名"><Input /></Form.Item>
          <Form.Item name="role" label="角色"><Select options={[{ value: 'operator', label: '运营专员' }, { value: 'guest', label: '访客(只读)' }]} /></Form.Item>
          <Form.Item name="phone" label="手机号"><Input /></Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
