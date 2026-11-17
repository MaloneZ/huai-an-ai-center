import React, { useEffect, useState } from 'react'
import { Card, Button, Table, Upload, message, Space, Modal, Popconfirm, Tag, Typography } from 'antd'
import { CloudDownloadOutlined, CloudUploadOutlined, DownloadOutlined, FileExcelOutlined, ReloadOutlined, DeleteOutlined } from '@ant-design/icons'
import api, { downloadFile } from '../api'

const { Paragraph } = Typography

export default function DataManage() {
  const [backups, setBackups] = useState([])
  const [backupLoading, setBackupLoading] = useState(false)
  const [restoreOpen, setRestoreOpen] = useState(false)

  const fetchBackups = () => {
    api.get('/data/backup/list').then(res => { if (res.success) setBackups(res.list) })
  }
  useEffect(() => { fetchBackups() }, [])

  const doBackup = async () => {
    setBackupLoading(true)
    try {
      const res = await api.post('/data/backup')
      if (res.success) {
        message.success(`备份成功：${res.filename}`)
        fetchBackups()
      } else message.error(res.message)
    } finally {
      setBackupLoading(false)
    }
  }

  const doRestore = async (name) => {
    const res = await api.post('/data/backup/restore', { name })
    if (res.success) {
      message.success(res.message)
      setRestoreOpen(false)
    } else message.error(res.message)
  }

  const doDelete = async (name) => {
    const res = await api.delete(`/data/backup/${name}`)
    if (res.success) { message.success('已删除'); fetchBackups() }
  }

  const importCompanies = async (file) => {
    const fd = new FormData()
    fd.append('file', file)
    const res = await api.post('/data/import/companies', fd)
    if (res.success) message.success(`导入完成：成功 ${res.inserted} 条${res.failed ? `，失败 ${res.failed} 条` : ''}`)
    else message.error(res.message)
    return false
  }

  const importExhibits = async (file) => {
    const fd = new FormData()
    fd.append('file', file)
    const res = await api.post('/data/import/exhibits', fd)
    if (res.success) message.success(`导入完成：成功 ${res.inserted} 条${res.failed ? `，失败 ${res.failed} 条` : ''}`)
    else message.error(res.message)
    return false
  }

  const backupColumns = [
    { title: '备份文件', dataIndex: 'name' },
    { title: '大小', dataIndex: 'size', render: v => (v / 1024).toFixed(1) + ' KB' },
    { title: '时间', dataIndex: 'time', render: v => new Date(v).toLocaleString('zh-CN') },
    {
      title: '操作', render: (_, r) => (
        <Space>
          <a onClick={() => downloadFile(`/data/backup/download/${r.name}`, r.name).catch(() => message.error('下载失败'))}>下载</a>
          <a onClick={() => doRestore(r.name)} style={{ color: '#F59E0B' }}>恢复</a>
          <Popconfirm title="确定删除此备份？" onConfirm={() => doDelete(r.name)}>
            <a style={{ color: '#DC2626' }}>删除</a>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div>
      <Card title="数据备份" extra={<Button type="primary" icon={<CloudDownloadOutlined />} loading={backupLoading} onClick={doBackup}>立即备份</Button>} style={{ marginBottom: 16 }}>
        <Paragraph type="secondary">
          备份将把数据库（center.db）与已上传的图片一并打包为 zip 文件保存到服务器。建议定期备份，恢复前系统会自动再备份一次当前数据以防误操作。
        </Paragraph>
        <Table rowKey="name" columns={backupColumns} dataSource={backups} pagination={false} size="small" />
      </Card>

      <Card title="数据导出" style={{ marginBottom: 16 }}>
        <Space wrap>
          <Button icon={<DownloadOutlined />} onClick={() => downloadFile('/data/export/companies', '企业列表.xlsx').catch(() => message.error('导出失败'))}>导出企业列表（Excel）</Button>
          <Button icon={<DownloadOutlined />} onClick={() => downloadFile('/data/export/exhibits', '展品清单.xlsx').catch(() => message.error('导出失败'))}>导出展品清单（Excel）</Button>
        </Space>
      </Card>

      <Card title="数据导入">
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <div>
            <Upload beforeUpload={importCompanies} showUploadList={false} accept=".xlsx,.xls,.csv">
              <Button icon={<CloudUploadOutlined />}>导入企业名单（Excel/CSV）</Button>
            </Upload>
            <Button type="link" onClick={() => downloadFile('/data/template/companies', '企业导入模板.xlsx').catch(() => message.error('下载失败'))}>下载企业导入模板</Button>
          </div>
          <div>
            <Upload beforeUpload={importExhibits} showUploadList={false} accept=".xlsx,.xls,.csv">
              <Button icon={<CloudUploadOutlined />}>导入展品清单（Excel/CSV）</Button>
            </Upload>
            <Button type="link" onClick={() => downloadFile('/data/template/exhibits', '展品导入模板.xlsx').catch(() => message.error('下载失败'))}>下载展品导入模板</Button>
          </div>
          <Paragraph type="secondary">
            导入模板支持中文表头：企业表含「县区、企业名称、主营范围、名单来源、是否已拜访、地址、联系人、联系方式、拜访情况、是否AI相关、AI标签」；展品表含「展品名称、产品类型、分类、获取方式、购买金额、租金、租赁到期、预警天数、AI标签、应用场景」。
          </Paragraph>
        </Space>
      </Card>
    </div>
  )
}
