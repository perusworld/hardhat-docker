import { Result, Space, Spin, Typography } from 'antd'
import { useParams } from 'react-router-dom'
import DetailList from '../components/DetailList'
import HashLink from '../components/HashLink'
import TransactionTable from '../components/TransactionTable'
import { useBlock, useNetworkSummary } from '../hooks/useExplorerQueries'
import { toExplorerTransaction } from '../lib/explorer'
import { formatAge, formatGwei, formatInteger, formatTimestamp, percentage } from '../lib/format'

export default function BlockDetail() {
  const { blockNumber } = useParams()
  const block = useBlock(blockNumber)
  const network = useNetworkSummary()

  if (block.isLoading) return <Spin fullscreen />

  if (block.isError || !block.data) {
    return <Result status="404" title="Block not found" subTitle={`No block found for ${blockNumber}.`} />
  }

  const confirmations = network.data ? Math.max(network.data.blockNumber - block.data.number, 0) : 0
  const transactions = [...(block.data.prefetchedTransactions ?? [])]
    .sort((left, right) => right.index - left.index)
    .map((transaction) => toExplorerTransaction(transaction, block.data.timestamp))

  return (
    <Space direction="vertical" size={18} className="page-stack">
      <div className="page-heading">
        <div>
          <Typography.Title level={2}>Block {formatInteger(block.data.number)}</Typography.Title>
          <Typography.Text type="secondary">{formatAge(block.data.timestamp)} on the local chain</Typography.Text>
        </div>
      </div>

      <DetailList
        items={[
          { label: 'Hash', value: <HashLink value={block.data.hash} compact={false} /> },
          { label: 'Parent Hash', value: <HashLink value={block.data.parentHash} compact={false} /> },
          { label: 'Timestamp', value: `${formatTimestamp(block.data.timestamp)} (${formatAge(block.data.timestamp)})` },
          { label: 'Transactions', value: formatInteger(block.data.transactions.length) },
          { label: 'Confirmations', value: formatInteger(confirmations) },
          { label: 'Miner', value: <HashLink value={block.data.miner} route={`/address/${block.data.miner}`} compact={false} /> },
          { label: 'Gas Used', value: `${formatInteger(block.data.gasUsed)} (${percentage(block.data.gasUsed, block.data.gasLimit)}%)` },
          { label: 'Gas Limit', value: formatInteger(block.data.gasLimit) },
          { label: 'Base Fee', value: `${formatGwei(block.data.baseFeePerGas)} Gwei` },
          { label: 'Difficulty', value: formatInteger(block.data.difficulty) },
          { label: 'Nonce', value: block.data.nonce },
          { label: 'Extra Data', value: <Typography.Text code>{block.data.extraData}</Typography.Text> },
        ]}
      />

      <TransactionTable title="Transactions in this block" transactions={transactions} loading={false} />
    </Space>
  )
}
