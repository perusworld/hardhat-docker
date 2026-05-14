import { Button, Space, Typography } from 'antd'
import { ethers } from 'ethers'
import { Link } from 'react-router-dom'
import { useAddressLabel } from '../hooks/useAddressLabels'
import { compactHash } from '../lib/format'

type HashLinkProps = {
  value?: string | null
  route?: string
  compact?: boolean
}

export default function HashLink({ value, route, compact = true }: HashLinkProps) {
  const isAddress = Boolean(value && ethers.isAddress(value))
  const addressLabel = useAddressLabel(isAddress ? value : undefined)

  if (!value) return <Typography.Text type="secondary">Contract creation</Typography.Text>

  const label = compact ? compactHash(value) : value
  const displayLabel = addressLabel.label
  const text = displayLabel ?? label
  const content = route ? (
    <Link to={route}>{text}</Link>
  ) : (
    <Typography.Text>{text}</Typography.Text>
  )

  return (
    <Space size={6} className="hash-link">
      <span>
        {content}
        {displayLabel && (
          <Typography.Text type="secondary" className="address-label-hash">
            {label}
          </Typography.Text>
        )}
      </span>
      <Typography.Text copyable={{ text: value }} />
    </Space>
  )
}

export function AddressButton({ address }: { address?: string | null }) {
  const addressLabel = useAddressLabel(address)
  if (!address) return <Typography.Text type="secondary">Contract creation</Typography.Text>

  return (
    <Button type="link" size="small" className="inline-link-button">
      <Link to={`/address/${address}`}>{addressLabel.label ?? compactHash(address)}</Link>
    </Button>
  )
}
