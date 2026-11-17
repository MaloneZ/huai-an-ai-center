import React, { useEffect, useState } from 'react'
import { Card, Table, Input, Select, Button, Tag, Space, message, Modal, Form, Row, Col, Statistic } from 'antd'
import { PlusOutlined, DownloadOutlined, UploadOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import api, { downloadFile } from '../api'

const DISTRICTS = ['清江浦区', '淮安区', '淮阴区', '洪泽区', '涟水县', '盱眙县', '金湖县', '经开区', '生态文旅区']
const SOURCES = ['政府推荐', '协会推荐', '自主搜集', '展会对接', '线上挖掘']

export default function Companies() {
  const navigate = useNavigate()
  const [list, setList] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [keyword, setKeyword] = useState('')
  const [district, setDistrict] = useState('')
  const [isAi, setIsAi] = useState('')
  const [visited, setVisited] = useState('')
  const [page, setPage] = useState(1)
  const [summary, setSummary] = useState({})
  const [addOpen, setAddOpen] = useState(false)
  const [form] = Form.useForm()

  const fetchData = () => {
    setLoading(true)
    api.get('/companies', { params: { keyword, district, is_ai: isAi, visited, page, pageSize: 50 } })
      .then(res => { if (res.success) { setList(res.list); setTotal(res.total) } })
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchData() }, [page])

  useEffect(() => {
    api.get('/stats/dashboard').then(res => {
      if (res.success) {
        const s = res.stats
        setSummary({ total: s.total, aiCount: s.aiCount, aiRate: s.aiRate, follow: res.alerts.filter(a => a.kind === 'follow').length })
      }
    })
  }, [])

  const onSearch = () => { setPage(1); fetchData() }

  const onAdd = async (values) => {
    const res = await api.post('/companies', values)
    if (res.success) {
      message.success('新增成功')
      setAddOpen(false)
      form.resetFields()
      fetchData()
      api.get('/stats/dashboard').then(r => { if (r.success) setSummary({ total: r.stats.total, aiCount: r.stats.aiCount, aiRate: r.stats.aiRate, follow: summary.follow }) })
    } else {
      message.error(res.message)
    }
  }

  const onExport = () => {
    downloadFile('/data/export/companies', '企业列表.xlsx').catch(() => message.error('导出失败'))
  }

  const columns = [
    { title: '序号', dataIndex: 'id', width: 60 },
    { title: '县区', dataIndex: 'district', width: 100 },
    { title: '企业名称', dataIndex: 'name', render: (v, r) => <a onClick={() => navigate(`/companies/${r.id}`)}>{v}</a> },
    { title: '主营范围', dataIndex: 'main_business', ellipsis: true },
    { title: '名单来源', dataIndex: 'source', width: 100 },
    { title: '是否已拜访', dataIndex: 'visited', width: 100, render: v => v ? <Tag color="green">已拜访</Tag> : <Tag color="orange">未拜访</Tag> },
    { title: '地址', dataIndex: 'address', ellipsis: true },
    { title: '联系人', dataIndex: 'contact', width: 90 },
    { title: '联系方式', dataIndex: 'phone', width: 130 },
    { title: '拜访情况', dataIndex: 'visit_note', ellipsis: true },
    { title: '是否AI相关', dataIndex: 'is_ai', width: 110, render: v => v ? <Tag color="purple">是 · AI</Tag> : <Tag>否</Tag> },
  ]

  return (
    <div>
      {/* 顶部汇总栏 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}><Card><Statistic title="已拜访企业" value={summary.total ?? '-'} /></Card></Col>
        <Col span={6}><Card><Statistic title="AI 相关企业" value={summary.aiCount ?? '-'} /></Card></Col>
        <Col span={6}><Card><Statistic title="AI 占比" value={summary.aiRate ?? '-'} suffix="%" /></Card></Col>
        <Col span={6}><Card><Statistic title="待跟进" value={summary.follow ?? 0} valueStyle={{ color: '#F59E0B' }} /></Card></Col>
      </Row>

      <Card>
        <Space style={{ marginBottom: 16, flexWrap: 'wrap' }}>
          <Input.Search placeholder="搜索企业名称/联系人/电话" allowClear style={{ width: 240 }} value={keyword} onChange={e => setKeyword(e.target.value)} onSearch={onSearch} />
          <Select placeholder="县区" style={{ width: 120 }} allowClear value={district || undefined} onChange={v => setDistrict(v || '')} options={DISTRICTS.map(d => ({ value: d, label: d }))} />
          <Select placeholder="AI相关" style={{ width: 120 }} allowClear value={isAi || undefined} onChange={v => setIsAi(v ?? '')} options={[{ value: '1', label: '是 AI 相关' }, { value: '0', label: '非 AI 相关' }]} />
          <Select placeholder="拜访状态" style={{ width: 120 }} allowClear value={visited || undefined} onChange={v => setVisited(v ?? '')} options={[{ value: '1', label: '已拜访' }, { value: '0', label: '未拜访' }]} />
          <Button onClick={onSearch}>查询</Button>
          <Button icon={<UploadOutlined />} onClick={() => navigate('/data')}>批量导入</Button>
          <Button icon={<DownloadOutlined />} onClick={onExport}>导出</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setAddOpen(true)}>新增企业</Button>
        </Space>

        <Table
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={list}
          scroll={{ x: 1500 }}
          pagination={{ current: page, pageSize: 50, total, showSizeChanger: false, onChange: setPage }}
        />
      </Card>

      <Modal title="新增企业" open={addOpen} onCancel={() => setAddOpen(false)} onOk={() => form.submit()} destroyOnClose>
        <Form form={form} layout="vertical" onFinish={onAdd}>
          <Form.Item name="name" label="企业名称" rules={[{ required: true, message: '请输入企业名称' }]}><Input /></Form.Item>
          <Row gutter={12}>
            <Col span={12}><Form.Item name="district" label="县区"><Select options={DISTRICTS.map(d => ({ value: d, label: d }))} /></Form.Item></Col>
            <Col span={12}><Form.Item name="source" label="名单来源"><Select options={SOURCES.map(d => ({ value: d, label: d }))} /></Form.Item></Col>
          </Row>
          <Form.Item name="main_business" label="主营范围"><Input.TextArea rows={2} /></Form.Item>
          <Row gutter={12}>
            <Col span={12}><Form.Item name="contact" label="联系人"><Input /></Form.Item></Col>
            <Col span={12}><Form.Item name="phone" label="联系方式"><Input /></Form.Item></Col>
          </Row>
          <Row gutter={12}>
            <Col span={12}><Form.Item name="is_ai" label="是否 AI 相关"><Select options={[{ value: 1, label: '是' }, { value: 0, label: '否' }]} /></Form.Item></Col>
            <Col span={12}><Form.Item name="visited" label="是否已拜访"><Select options={[{ value: 1, label: '已拜访' }, { value: 0, label: '未拜访' }]} /></Form.Item></Col>
          </Row>
          <Form.Item name="address" label="地址"><Input /></Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
