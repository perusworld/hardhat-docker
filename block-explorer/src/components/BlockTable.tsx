import { Card, Table, Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { Link } from 'react-router-dom'
import type { ExplorerBlock } from '../lib/explorer'
import { formatAge, formatGwei, formatInteger, formatTimestamp, percentage } from '../lib/format'
import HashLink from './HashLink'

type BlockTableProps = {
  blocks?: ExplorerBlock[]
  loading?: boolean
  title?: string
}

const columns: ColumnsType<ExplorerBlock> = [
  {
    title: 'Block',
    dataIndex: 'number',
    width: 110,
    render: (number: number) => <Link to={`/blocks/${number}`}>{formatInteger(number)}</Link>,
  },
  {
    title: 'Time',
    dataIndex: 'timestamp',
    width: 210,
    render: (timestamp: number) => (
      <Typography.Text>{formatTimestamp(timestamp)}</Typography.Text>
    ),
  },
  {
    title: 'Age',
    dataIndex: 'timestamp',
    width: 120,
    render: (timestamp: number) => (
      <Typography.Text type="secondary">{formatAge(timestamp)}</Typography.Text>
    ),
  },
  {
    title: 'Transactions',
    width: 130,
    render: (_, block) => <Tag>{formatInteger(block.transactions.length)}</Tag>,
  },
  {
    title: 'Miner',
    dataIndex: 'miner',
    render: (miner: string) => <HashLink value={miner} route={`/address/${miner}`} />,
  },
  {
    title: 'Gas Used',
    width: 170,
    render: (_, block) => (
      <span>
        {formatInteger(block.gasUsed)} <Typography.Text type="secondary">({percentage(block.gasUsed, block.gasLimit)}%)</Typography.Text>
      </span>
    ),
  },
  {
    title: 'Base Fee',
    dataIndex: 'baseFeePerGas',
    width: 130,
    render: (baseFeePerGas?: bigint | null) => `${formatGwei(baseFeePerGas)} Gwei`,
  },
]

export default function BlockTable({ blocks, loading, title = 'Blocks' }: BlockTableProps) {
  return (
    <Card title={title} className="table-card">
      <Table
        rowKey={(block) => block.hash ?? String(block.number)}
        columns={columns}
        dataSource={blocks ?? []}
        loading={loading}
        pagination={false}
        scroll={{ x: 840 }}
        size="middle"
      />
    </Card>
  )
}
