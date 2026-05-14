import { Space, Typography } from 'antd'
import TokenSummaryTable from '../components/TokenSummaryTable'
import TokenTransferTable from '../components/TokenTransferTable'
import { useRecentTokenTransfers, useTokenSummaries } from '../hooks/useExplorerQueries'

export default function TokensPage() {
  const summaries = useTokenSummaries('tokens')
  const transfers = useRecentTokenTransfers({ mode: 'tokens', limit: 100 })

  return (
    <Space direction="vertical" size={18} className="page-stack">
      <div className="page-heading">
        <div>
          <Typography.Title level={2}>Tokens</Typography.Title>
          <Typography.Text type="secondary">ERC-20 contracts and transfers discovered in recent local blocks.</Typography.Text>
        </div>
      </div>
      <TokenSummaryTable title="Token Contracts" tokens={summaries.data} loading={summaries.isLoading} />
      <TokenTransferTable title="Recent Token Transfers" transfers={transfers.data} loading={transfers.isLoading} />
    </Space>
  )
}
