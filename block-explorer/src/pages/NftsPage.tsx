import { Space, Typography } from 'antd'
import TokenSummaryTable from '../components/TokenSummaryTable'
import TokenTransferTable from '../components/TokenTransferTable'
import { useRecentTokenTransfers, useTokenSummaries } from '../hooks/useExplorerQueries'

export default function NftsPage() {
  const summaries = useTokenSummaries('nfts')
  const transfers = useRecentTokenTransfers({ mode: 'nfts', limit: 100 })

  return (
    <Space direction="vertical" size={18} className="page-stack">
      <div className="page-heading">
        <div>
          <Typography.Title level={2}>NFTs</Typography.Title>
          <Typography.Text type="secondary">ERC-721 and ERC-1155 contracts and transfers discovered in recent local blocks.</Typography.Text>
        </div>
      </div>
      <TokenSummaryTable title="NFT Contracts" tokens={summaries.data} loading={summaries.isLoading} />
      <TokenTransferTable title="Recent NFT Transfers" transfers={transfers.data} loading={transfers.isLoading} />
    </Space>
  )
}
