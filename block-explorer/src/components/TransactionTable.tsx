import { Card, Table, Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { Link } from 'react-router-dom'
import type { ExplorerTransaction } from '../lib/explorer'
import { formatAge, formatEth, formatGwei, formatInteger, formatTimestamp } from '../lib/format'
import HashLink from './HashLink'

type TransactionTableProps = {
  loading?: boolean
  title?: string
  transactions?: ExplorerTransaction[]
}

const columns: ColumnsType<ExplorerTransaction> = [
  {
    title: 'Txn Hash',
    dataIndex: 'hash',
    width: 190,
    render: (hash: string) => <HashLink value={hash} route={`/tx/${hash}`} />,
  },
  {
    title: 'Method',
    dataIndex: 'data',
    width: 110,
    render: (data: string) => <Tag>{data === '0x' ? 'Transfer' : data.slice(0, 10)}</Tag>,
  },
  {
    title: 'Block',
    dataIndex: 'blockNumber',
    width: 100,
    render: (blockNumber?: number | null) =>
      blockNumber == null ? <Typography.Text type="secondary">Pending</Typography.Text> : <Link to={`/blocks/${blockNumber}`}>{formatInteger(blockNumber)}</Link>,
  },
  {
    title: 'Time',
    dataIndex: 'timestamp',
    width: 210,
    render: (timestamp?: number) => (
      <Typography.Text>{formatTimestamp(timestamp)}</Typography.Text>
    ),
  },
  {
    title: 'Age',
    dataIndex: 'timestamp',
    width: 120,
    render: (timestamp?: number) => (
      <Typography.Text type="secondary">{formatAge(timestamp)}</Typography.Text>
    ),
  },
  {
    title: 'From',
    dataIndex: 'from',
    render: (from: string) => <HashLink value={from} route={`/address/${from}`} />,
  },
  {
    title: 'To',
    dataIndex: 'to',
    render: (to?: string | null) => (to ? <HashLink value={to} route={`/address/${to}`} /> : <Typography.Text type="secondary">Contract creation</Typography.Text>),
  },
  {
    title: 'Value',
    dataIndex: 'value',
    width: 130,
    render: (value: bigint) => `${formatEth(value)} ETH`,
  },
  {
    title: 'Gas Price',
    dataIndex: 'gasPrice',
    width: 130,
    render: (gasPrice?: bigint | null) => `${formatGwei(gasPrice)} Gwei`,
  },
]

export default function TransactionTable({ loading, title = 'Transactions', transactions }: TransactionTableProps) {
  return (
    <Card title={title} className="table-card">
      <Table
        rowKey={(transaction) => transaction.hash}
        columns={columns}
        dataSource={transactions ?? []}
        loading={loading}
        pagination={false}
        scroll={{ x: 1120 }}
        size="middle"
      />
    </Card>
  )
}
