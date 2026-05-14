import { Card, Table, Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { ethers } from 'ethers'
import { Link } from 'react-router-dom'
import type { TokenTransfer } from '../lib/tokenTransfers'
import { formatAge, formatInteger, formatTimestamp } from '../lib/format'
import HashLink from './HashLink'

type TokenTransferTableProps = {
  loading?: boolean
  title?: string
  transfers?: TokenTransfer[]
}

function formatAmount(transfer: TokenTransfer) {
  if (transfer.kind === 'ERC-721') return `#${transfer.tokenId}`
  if (transfer.kind === 'ERC-1155') return `${transfer.amount?.toString() ?? '0'} of #${transfer.tokenId}`
  if (transfer.amount == null) return '0'

  const decimals = transfer.tokenDecimals ?? 18
  const value = ethers.formatUnits(transfer.amount, decimals)
  const symbol = transfer.tokenSymbol ?? ''
  return `${value} ${symbol}`.trim()
}

const columns: ColumnsType<TokenTransfer> = [
  {
    title: 'Token',
    dataIndex: 'tokenAddress',
    width: 220,
    render: (_value: string, transfer) => (
      <div>
        <HashLink value={transfer.tokenAddress} route={`/address/${transfer.tokenAddress}`} />
        <Typography.Text type="secondary" className="block-text">
          {transfer.tokenName ?? transfer.tokenSymbol ?? 'Unknown token'}
        </Typography.Text>
      </div>
    ),
  },
  {
    title: 'Type',
    dataIndex: 'kind',
    width: 100,
    render: (kind: TokenTransfer['kind']) => <Tag color={kind === 'ERC-20' ? 'blue' : 'purple'}>{kind}</Tag>,
  },
  {
    title: 'Amount / ID',
    width: 150,
    render: (_, transfer) => formatAmount(transfer),
  },
  {
    title: 'Txn Hash',
    dataIndex: 'transactionHash',
    width: 170,
    render: (hash: string) => <HashLink value={hash} route={`/tx/${hash}`} />,
  },
  {
    title: 'Block',
    dataIndex: 'blockNumber',
    width: 90,
    render: (blockNumber: number) => <Link to={`/blocks/${blockNumber}`}>{formatInteger(blockNumber)}</Link>,
  },
  {
    title: 'Time',
    dataIndex: 'timestamp',
    width: 210,
    render: (timestamp?: number) => formatTimestamp(timestamp),
  },
  {
    title: 'Age',
    dataIndex: 'timestamp',
    width: 120,
    render: (timestamp?: number) => <Typography.Text type="secondary">{formatAge(timestamp)}</Typography.Text>,
  },
  {
    title: 'From',
    dataIndex: 'from',
    render: (from: string) =>
      from === ethers.ZeroAddress ? <Typography.Text type="secondary">Mint</Typography.Text> : <HashLink value={from} route={`/address/${from}`} />,
  },
  {
    title: 'To',
    dataIndex: 'to',
    render: (to: string) =>
      to === ethers.ZeroAddress ? <Typography.Text type="secondary">Burn</Typography.Text> : <HashLink value={to} route={`/address/${to}`} />,
  },
]

export default function TokenTransferTable({ loading, title = 'Token Transfers', transfers }: TokenTransferTableProps) {
  return (
    <Card title={title} className="table-card">
      <Table
        rowKey={(transfer) => transfer.id}
        columns={columns}
        dataSource={transfers ?? []}
        loading={loading}
        pagination={false}
        scroll={{ x: 1280 }}
        size="middle"
      />
    </Card>
  )
}
