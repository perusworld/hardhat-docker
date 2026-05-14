import { Card, Table, Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import type { TokenSummary } from '../lib/tokenTransfers'
import { formatInteger } from '../lib/format'
import HashLink from './HashLink'

type TokenSummaryTableProps = {
  loading?: boolean
  title: string
  tokens?: TokenSummary[]
}

const columns: ColumnsType<TokenSummary> = [
  {
    title: 'Contract',
    dataIndex: 'address',
    render: (address: string) => <HashLink value={address} route={`/address/${address}`} />,
  },
  {
    title: 'Name',
    dataIndex: 'name',
    render: (name?: string) => name ?? <Typography.Text type="secondary">Unknown</Typography.Text>,
  },
  {
    title: 'Symbol',
    dataIndex: 'symbol',
    width: 120,
    render: (symbol?: string) => symbol ?? <Typography.Text type="secondary">-</Typography.Text>,
  },
  {
    title: 'Type',
    dataIndex: 'kind',
    width: 110,
    render: (kind: TokenSummary['kind']) => <Tag color={kind === 'ERC-20' ? 'blue' : 'purple'}>{kind}</Tag>,
  },
  {
    title: 'Transfers',
    dataIndex: 'transferCount',
    width: 120,
    render: (transferCount: number) => formatInteger(transferCount),
  },
]

export default function TokenSummaryTable({ loading, title, tokens }: TokenSummaryTableProps) {
  return (
    <Card title={title} className="table-card">
      <Table
        rowKey={(token) => token.address}
        columns={columns}
        dataSource={tokens ?? []}
        loading={loading}
        pagination={false}
        scroll={{ x: 820 }}
        size="middle"
      />
    </Card>
  )
}
