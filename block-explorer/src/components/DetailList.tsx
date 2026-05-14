import { Card, Col, Row, Typography } from 'antd'
import type { ReactNode } from 'react'

export type DetailItem = {
  label: string
  value: ReactNode
}

type DetailListProps = {
  items: DetailItem[]
}

export default function DetailList({ items }: DetailListProps) {
  return (
    <Card className="detail-card">
      {items.map((item) => (
        <Row key={item.label} gutter={[16, 10]} className="detail-row">
          <Col xs={24} md={7}>
            <Typography.Text type="secondary">{item.label}</Typography.Text>
          </Col>
          <Col xs={24} md={17} className="detail-value">
            {item.value}
          </Col>
        </Row>
      ))}
    </Card>
  )
}
