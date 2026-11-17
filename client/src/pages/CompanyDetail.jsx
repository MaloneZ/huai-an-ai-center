import React, { useEffect, useState } from 'react'
import { Card, Descriptions, Tag, Button, Upload, Image, Timeline, Modal, Form, Input, DatePicker, Row, Col, message, Space } from 'antd'
import { ArrowLeftOutlined, PlusOutlined, UploadOutlined } from '@ant-design/icons'
import { useNavigate, useParams } from 'react-router-dom'
import api from '../api'

export default function CompanyDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [company, setCompany] = useState(null)
  const [records, setRecords] = useState([])
  const [recordOpen, setRecordOpen] = useState(false)
  const [form] = Form.useForm()

  const fetchData = () => {
    api.get(`/companies/${id}`).then(res => {
      if (res.success) {
        setCompany(res.company)
        setRecords(res.records)
      }
    })
  }
  useEffect(() => { fetchData() }, [id])

  const uploadImage = async (file) => {
    const fd = new FormData()
    fd.append('file', file)
    const res = await api.post('/data/upload', fd)
    if (res.success) {
      const images = JSON.parse(company.images || '[]')
      const newImages = [...images, res.url]
      await api.put(`/companies/${id}`, { ...company, images: newImages })
      setCompany({ ...company, images: JSON.stringify(newImages) })
      message.success('图片上传成功')
    }
    return false
  }

  const addRecord = async (values) => {
    const res = await api.post(`/companies/${id}/visit-record`, {
      visit_date: values.visit_date?.format('YYYY-MM-DD') || '',
      visitor: values.visitor || '',
      result: values.result || '',
      next_action: values.next_action || '',
    })
    if (res.success) {
      message.success('拜访记录已添加')
      setRecordOpen(false)
      form.resetFields()
      fetchData()
    }
  }

  if (!company) return <Card loading />

  const images = JSON.parse(company.images || '[]')
  const tags = JSON.parse(company.ai_tags || '[]')

  return (
    <div>
      <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/companies')} style={{ marginBottom: 16 }}>返回列表</Button>
      <Row gutter={16}>
        <Col span={16}>
          <Card title="企业基本信息" style={{ marginBottom: 16 }}>
            <Descriptions column={2} bordered size="small">
              <Descriptions.Item label="企业名称">{company.name}</Descriptions.Item>
              <Descriptions.Item label="所在县区">{company.district}</Descriptions.Item>
              <Descriptions.Item label="主营范围" span={2}>{company.main_business}</Descriptions.Item>
              <Descriptions.Item label="名单来源">{company.source}</Descriptions.Item>
              <Descriptions.Item label="是否 AI 相关">{company.is_ai ? <Tag color="purple">是 · AI 相关</Tag> : <Tag>否</Tag>}</Descriptions.Item>
              <Descriptions.Item label="拜访状态">{company.visited ? <Tag color="green">已拜访</Tag> : <Tag color="orange">未拜访</Tag>}</Descriptions.Item>
              <Descriptions.Item label="最近拜访时间">{company.visit_time || '—'}</Descriptions.Item>
              <Descriptions.Item label="企业地址" span={2}>{company.address}</Descriptions.Item>
            </Descriptions>
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 8 }}>AI 技术标签</div>
              {tags.length ? tags.map(t => <Tag key={t} color="geekblue">{t}</Tag>) : <span style={{ color: '#9ca3af' }}>无</span>}
            </div>
          </Card>

          <Card title="拜访记录">
            <Timeline
              items={records.length ? records.map(r => ({
                children: (
                  <div>
                    <div><b>{r.visit_date}</b> · {r.visitor}</div>
                    <div style={{ color: '#6b7280', fontSize: 13 }}>{r.result}</div>
                    {r.next_action && <div style={{ color: '#2563EB', fontSize: 13 }}>下一步：{r.next_action}</div>}
                  </div>
                ),
              })) : [{ children: '暂无拜访记录' }]}
            />
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setRecordOpen(true)}>记录拜访</Button>
          </Card>
        </Col>

        <Col span={8}>
          <Card title="联系人信息" style={{ marginBottom: 16 }}>
            <Descriptions column={1} size="small">
              <Descriptions.Item label="联系人">{company.contact || '—'}</Descriptions.Item>
              <Descriptions.Item label="联系方式">{company.phone || '—'}</Descriptions.Item>
            </Descriptions>
          </Card>

          <Card title="企业相关图片">
            <Upload beforeUpload={uploadImage} showUploadList={false}>
              <Button icon={<UploadOutlined />}>上传图片</Button>
            </Upload>
            <div style={{ marginTop: 12 }}>
              <Image.PreviewGroup>
                <Space wrap>
                  {images.map((img, i) => (
                    <Image key={i} src={img} width={100} height={80} style={{ objectFit: 'cover', borderRadius: 6 }} />
                  ))}
                </Space>
              </Image.PreviewGroup>
              {!images.length && <div style={{ color: '#9ca3af' }}>暂无图片</div>}
            </div>
          </Card>
        </Col>
      </Row>

      <Modal title="记录拜访" open={recordOpen} onCancel={() => setRecordOpen(false)} onOk={() => form.submit()} destroyOnClose>
        <Form form={form} layout="vertical" onFinish={addRecord}>
          <Form.Item name="visit_date" label="拜访日期"><DatePicker style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="visitor" label="拜访人"><Input /></Form.Item>
          <Form.Item name="result" label="拜访情况"><Input.TextArea rows={3} /></Form.Item>
          <Form.Item name="next_action" label="下一步动作"><Input /></Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
