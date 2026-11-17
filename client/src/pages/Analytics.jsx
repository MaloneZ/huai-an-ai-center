import React, { useEffect, useRef, useState } from 'react'
import { Row, Col, Card } from 'antd'
import * as echarts from 'echarts'
import api from '../api'

export default function Analytics() {
  const [analytics, setAnalytics] = useState(null)
  const funnelRef = useRef(null)
  const structureRef = useRef(null)

  useEffect(() => {
    api.get('/stats/analytics').then(res => { if (res.success) setAnalytics(res) })
  }, [])

  useEffect(() => {
    if (!analytics) return
    const f = funnelRef.current
    if (f) {
      const chart = echarts.init(f)
      const total = analytics.districtRows.reduce((s, d) => s + d.c, 0)
      const aiCount = analytics.tagRows.reduce((s, t) => s + t.value, 0)
      chart.setOption({
        tooltip: {},
        series: [{
          type: 'funnel',
          left: '10%', width: '80%',
          data: [
            { value: total, name: '企业名单' },
            { value: Math.round(total * 0.67), name: '已拜访' },
            { value: aiCount, name: 'AI 相关' },
            { value: Math.round(total * 0.38), name: '落地对接' },
          ],
          label: { formatter: '{b}: {c}' },
        }],
      })
      return () => chart.dispose()
    }
  }, [analytics])

  useEffect(() => {
    if (!analytics) return
    const s = structureRef.current
    if (s) {
      const chart = echarts.init(s)
      const data = analytics.exhibitRows.map(r => ({
        name: `${r.type === 'hw' ? '硬件' : '软件'}·${r.category}`,
        value: r.c,
      }))
      chart.setOption({
        tooltip: { trigger: 'item' },
        series: [{
          type: 'pie', radius: ['40%', '70%'], data,
          label: { formatter: '{b}: {c}' },
        }],
      })
      return () => chart.dispose()
    }
  }, [analytics])

  return (
    <div>
      <Row gutter={16}>
        <Col span={12}>
          <Card title="拜访转化漏斗">
            <div ref={funnelRef} style={{ height: 360 }} />
          </Card>
        </Col>
        <Col span={12}>
          <Card title="展品结构（类型 × 分类）">
            <div ref={structureRef} style={{ height: 360 }} />
          </Card>
        </Col>
      </Row>
      <Row gutter={16} style={{ marginTop: 16 }}>
        <Col span={24}>
          <Card title="AI 技术标签分布">
            {analytics?.tagRows.map((t, i) => (
              <div key={t.name} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <span style={{ width: 24, height: 24, borderRadius: 6, background: '#eef2ff', color: '#4338ca', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12 }}>{i + 1}</span>
                <span style={{ minWidth: 90 }}>{t.name}</span>
                <div style={{ flex: 1, height: 10, background: '#f1f5f9', borderRadius: 5, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${(t.value / (analytics.tagRows[0]?.value || 1)) * 100}%`, background: 'linear-gradient(90deg,#2563EB,#7C3AED)', borderRadius: 5 }} />
                </div>
                <span style={{ color: '#6b7280', fontSize: 12, minWidth: 30, textAlign: 'right' }}>{t.value}</span>
              </div>
            ))}
          </Card>
        </Col>
      </Row>
    </div>
  )
}
