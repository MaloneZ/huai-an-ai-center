import React, { useEffect, useState } from 'react'
import { Card, Tabs, Select, Button, Tag, Row, Col, Space, Modal, Form, Input, InputNumber, DatePicker, message, Empty } from 'antd'
import { PlusOutlined, DownloadOutlined, UploadOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import api, { downloadFile } from '../api'

const CATEGORIES = ['展陈类', '资产类', '消费品类', '其他']

export default function Exhibits() {
  const navigate = useNavigate()
  const [list, setList] = useState([])
  const [type, setType] = useState('all')
  const [category, setCategory] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [form] = Form.useForm()
  const [sourceType, setSourceType] = useState('购买')

  const fetchData = () => {
    api.get('/exhibits', { params: { type: type === 'all' ? '' : type, category } })
      .then(res => { if (res.success) setList(res.list) })
  }
  useEffect(() => { fetchData() }, [type, category])

  const onAdd = async (values) => {
    const res = await api.post('/exhibits', {
      ...values,
      rent_expire: values.rent_expire?.format('YYYY-MM-DD') || '',
      ai_tags: values.ai_tags ? values.ai_tags.split(/[、,，]/).map(t => t.trim()).filter(Boolean) : [],
    })
    if (res.success) {
      message.success('新增成功')
      setAddOpen(false)
      form.resetFields()
      fetchData()
    } else message.error(res.message)
  }

  const statusMap = {
    normal: { text: '正常', color: 'green' },
    soon: { text: '即将到期', color: 'orange' },
    expired: { text: '已过期', color: 'red' },
  }

  const renderCard = (e) => {
    const st = statusMap[e.status] || statusMap.normal
    const tags = JSON.parse(e.ai_tags || '[]')
    return (
      <Col span={8} key={e.id}>
        <Card style={{ height: '100%' }} hoverable
          actions={[
            <a key="edit" onClick={() => message.info('编辑功能开发中')}>编辑</a>,
          ]}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <span style={{ width: 44, height: 44, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, background: e.type === 'hw' ? '#eaf1fc' : '#f1ebfe', color: e.type === 'hw' ? '#2563EB' : '#7C3AED' }}>
              {e.type === 'hw' ? '🔧' : '💻'}
            </span>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{e.name}</div>
              <div style={{ fontSize: 12, color: '#6b7280' }}>{e.type === 'hw' ? '硬件产品' : '软件产品'} · {e.category}</div>
            </div>
          </div>
          <Tag color={st.color}>{st.text}</Tag>
          <div style={{ marginTop: 10 }}>
            {tags.map(t => <Tag key={t} color="geekblue" style={{ fontSize: 11 }}>{t}</Tag>)}
          </div>
          <div style={{ marginTop: 10, fontSize: 13, color: '#4b5563', lineHeight: 1.9, borderTop: '1px solid #f1f3f7', paddingTop: 10 }}>
            <div>获取方式：<b>{e.source_type}</b></div>
            {e.source_type === '租赁'
              ? <><div>租金：<b>¥{e.rent_amount}</b>/月</div><div>到期：<b>{e.rent_expire}</b></div><div>预警：提前 <b>{e.warn_days}</b> 天</div></>
              : <div>购买金额：<b>¥{e.purchase_amount}</b></div>}
            {e.scene && <div style={{ marginTop: 6, color: '#6b7280' }}>场景：{e.scene}</div>}
          </div>
        </Card>
      </Col>
    )
  }

  return (
    <div>
      <Card>
        <Space style={{ marginBottom: 16, flexWrap: 'wrap' }}>
          <Tabs
            activeKey={type}
            onChange={setType}
            items={[
              { key: 'all', label: '全部' },
              { key: 'hw', label: '硬件产品' },
              { key: 'sw', label: '软件产品' },
            ]}
          />
          <Select placeholder="分类" style={{ width: 130 }} allowClear value={category || undefined} onChange={v => setCategory(v || '')} options={CATEGORIES.map(c => ({ value: c, label: c }))} />
          <Button icon={<UploadOutlined />} onClick={() => navigate('/data')}>批量导入</Button>
          <Button icon={<DownloadOutlined />} onClick={() => downloadFile('/data/export/exhibits', '展品清单.xlsx').catch(() => message.error('导出失败'))}>导出</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setAddOpen(true)}>新增展品</Button>
        </Space>

        {list.length === 0 ? <Empty description="暂无展品" /> : (
          <Row gutter={[16, 16]}>{list.map(renderCard)}</Row>
        )}
      </Card>

      <Modal title="新增展品" open={addOpen} onCancel={() => setAddOpen(false)} onOk={() => form.submit()} destroyOnClose>
        <Form form={form} layout="vertical" onFinish={onAdd} initialValues={{ source_type: '购买', warn_days: 7 }}>
          <Form.Item name="name" label="展品名称" rules={[{ required: true, message: '请输入展品名称' }]}><Input /></Form.Item>
          <Row gutter={12}>
            <Col span={12}><Form.Item name="type" label="产品类型" rules={[{ required: true }]}><Select options={[{ value: 'hw', label: '硬件产品' }, { value: 'sw', label: '软件产品' }]} /></Form.Item></Col>
            <Col span={12}><Form.Item name="category" label="分类" rules={[{ required: true }]}><Select options={CATEGORIES.map(c => ({ value: c, label: c }))} /></Form.Item></Col>
          </Row>
          <Form.Item name="source_type" label="获取方式" rules={[{ required: true }]}>
            <Select onChange={v => setSourceType(v)} options={[{ value: '租赁', label: '租赁' }, { value: '购买', label: '购买' }]} />
          </Form.Item>
          {sourceType === '租赁' ? (
            <>
              <Form.Item name="rent_amount" label="租金（元/月）"><InputNumber style={{ width: '100%' }} min={0} /></Form.Item>
              <Form.Item name="rent_expire" label="租赁到期时间"><DatePicker style={{ width: '100%' }} /></Form.Item>
              <Form.Item name="warn_days" label="续租预警期限（天）"><InputNumber style={{ width: '100%' }} min={1} /></Form.Item>
            </>
          ) : (
            <Form.Item name="purchase_amount" label="购买金额（元）"><InputNumber style={{ width: '100%' }} min={0} /></Form.Item>
          )}
          <Form.Item name="ai_tags" label="AI 标签（用顿号/逗号分隔）"><Input placeholder="如：大模型、计算机视觉" /></Form.Item>
          <Form.Item name="scene" label="应用场景说明"><Input.TextArea rows={3} /></Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
