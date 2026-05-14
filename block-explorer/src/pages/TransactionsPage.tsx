import { Space, Typography } from 'antd'
import TransactionTable from '../components/TransactionTable'
import { useLatestTransactions } from '../hooks/useExplorerQueries'

export default function TransactionsPage() {
  const { data, isLoading } = useLatestTransactions(50)

  return (
    <Space direction="vertical" size={18} className="page-stack">
      <div className="page-heading">
        <div>
          <Typography.Title level={2}>Transactions</Typography.Title>
          <Typography.Text type="secondary">Most recent transactions found while scanning the local chain.</Typography.Text>
        </div>
      </div>
      <TransactionTable transactions={data} loading={isLoading} />
    </Space>
  )
}
