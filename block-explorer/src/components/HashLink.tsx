import { Button, Space, Typography } from 'antd'
import { Link } from 'react-router-dom'
import { compactHash } from '../lib/format'

type HashLinkProps = {
  value?: string | null
  route?: string
  compact?: boolean
}

export default function HashLink({ value, route, compact = true }: HashLinkProps) {
  if (!value) return <Typography.Text type="secondary">Contract creation</Typography.Text>

  const label = compact ? compactHash(value) : value
  const content = route ? (
    <Link to={route}>{label}</Link>
  ) : (
    <Typography.Text>{label}</Typography.Text>
  )

  return (
    <Space size={6} className="hash-link">
      {content}
      <Typography.Text copyable={{ text: value }} />
    </Space>
  )
}

export function AddressButton({ address }: { address?: string | null }) {
  if (!address) return <Typography.Text type="secondary">Contract creation</Typography.Text>

  return (
    <Button type="link" size="small" className="inline-link-button">
      <Link to={`/address/${address}`}>{compactHash(address)}</Link>
    </Button>
  )
}
