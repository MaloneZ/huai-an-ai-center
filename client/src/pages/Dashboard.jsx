import React, { useEffect, useRef, useState } from 'react'
import { Row, Col, Card, Statistic, Alert, List, Tag, Empty } from 'antd'
import { BankOutlined, RobotOutlined, LaptopOutlined, ToolOutlined, WarningOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import * as echarts from 'echarts'
import api from '../api'

export default function Dashboard() {
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)
  const [alerts, setAlerts] = useState([])
  const [analytics, setAnalytics] = useState(null)
  const districtRef = useRef(null)
  const tagRef = useRef(null)

  useEffect(() => {
    api.get('/stats/dashboard').then(res => {
      if (res.success) {
        setStats(res.stats)
        setAlerts(res.alerts)
      }
    })
    api.get('/stats/analytics').then(res => {
      if (res.success) setAnalytics(res)
    })
  }, [])

  useEffect(() => {
    if (!analytics) return
    // 县区分布柱状图
    const dc = districtRef.current
    if (dc) {
      const chart = echarts.init(dc)
      chart.setOption({
        grid: { left: 40, right: 20, top: 20, bottom: 30 },
        xAxis: { type: 'category', data: analytics.districtRows.map(d => d.district) },
        yAxis: { type: 'value' },
        series: [{ type: 'bar', data: analytics.districtRows.map(d => d.c), itemStyle: { color: '#7C3AED', borderRadius: [4, 4, 0, 0] }, barWidth: 24 }],
      })
      return () => chart.dispose()
    }
  }, [analytics])

  useEffect(() => {
    if (!analytics) return
    const tc = tagRef.current
    if (tc) {
      const chart = echarts.init(tc)
      const top = analytics.tagRows.slice(0, 8)
      chart.setOption({
        grid: { left: 80, right: 30, top: 10, bottom: 20 },
        xAxis: { type: 'value' },
        yAxis: { type: 'category', data: top.map(t => t.name).reverse() },
        series: [{ type: 'bar', data: top.map(t => t.value).reverse(), itemStyle: { color: '#2563EB', borderRadius: [0, 4, 4, 0] }, barWidth: 16 }],
      })
      return () => chart.dispose()
    }
  }, [analytics])

  const statCards = [
    { title: '拜访企业数量', value: stats?.total ?? '-', icon: <BankOutlined />, color: '#2563EB', bg: '#eaf1fc', extra: `本月新增 +${stats?.monthNew ?? 0}` },
    { title: 'AI 相关企业', value: stats?.aiCount ?? '-', icon: <RobotOutlined />, color: '#7C3AED', bg: '#f1ebfe', extra: `占比 ${stats?.aiRate ?? 0}%` },
    { title: '展陈品 · 软件类', value: stats?.swCount ?? '-', icon: <LaptopOutlined />, color: '#16A34A', bg: '#e8f7ee', extra: '入馆软件展品' },
    { title: '展陈品 · 硬件类', value: stats?.hwCount ?? '-', icon: <ToolOutlined />, color: '#F59E0B', bg: '#fef3e0', extra: '入馆硬件展品' },
  ]

  return (
    <div>
      <Row gutter={16}>
        {statCards.map((c, i) => (
          <Col span={6} key={i}>
            <Card>
              <Statistic
                title={c.title}
                value={c.value}
                prefix={<span style={{ background: c.bg, color: c.color, borderRadius: 10, width: 40, height: 40, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, marginRight: 8 }}>{c.icon}</span>}
                suffix={<span style={{ fontSize: 12, color: '#6b7280' }}>{c.extra}</span>}
              />
            </Card>
          </Col>
        ))}
      </Row>

      <Card title={<span><WarningOutlined style={{ color: '#DC2626', marginRight: 8 }} />预警提醒</span>} style={{ marginTop: 16 }}>
        {alerts.length === 0 ? <Empty description="暂无预警" /> : (
          <List
            dataSource={alerts}
            renderItem={(a) => (
              <List.Item
                actions={[
                  <a key="go" onClick={() => navigate(a.kind === 'renew' ? '/exhibits' : '/companies')}>去处理</a>,
                ]}
              >
                <List.Item.Meta
                  title={
                    <span>
                      <Tag color={a.days_left < 0 ? 'red' : 'orange'}>{a.days_left < 0 ? '已过期' : '即将到期'}</Tag>
                      {a.name}
                    </span>
                  }
                  description={a.kind === 'renew' ? `租赁 ${a.days_left} 天后到期（提前 ${a.warn_days} 天预警）` : '待跟进拜访（AI 相关企业）'}
                />
              </List.Item>
            )}
          />
        )}
      </Card>

      <Row gutter={16} style={{ marginTop: 16 }}>
        <Col span={14}>
          <Card title="各县区企业分布">
            <div ref={districtRef} style={{ height: 300 }} />
          </Card>
        </Col>
        <Col span={10}>
          <Card title="AI 技术标签 TOP8">
            <div ref={tagRef} style={{ height: 300 }} />
          </Card>
        </Col>
      </Row>
    </div>
  )
}
