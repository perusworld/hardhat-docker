import { Card, Result, Space, Spin, Tag, Typography } from 'antd'
import { Link, useParams } from 'react-router-dom'
import DecodedInputData from '../components/DecodedInputData'
import DetailList from '../components/DetailList'
import HashLink from '../components/HashLink'
import TokenTransferTable from '../components/TokenTransferTable'
import { useTransaction, useTransactionTokenTransfers } from '../hooks/useExplorerQueries'
import { getTransactionFee } from '../lib/explorer'
import { formatAge, formatEth, formatGwei, formatInteger, formatTimestamp, percentage } from '../lib/format'

export default function TransactionDetail() {
  const { hash } = useParams()
  const { data, isError, isLoading } = useTransaction(hash)
  const tokenTransfers = useTransactionTokenTransfers(hash)

  if (isLoading) return <Spin fullscreen />

  if (isError || !data) {
    return <Result status="404" title="Transaction not found" subTitle={`No transaction found for ${hash}.`} />
  }

  const fee = getTransactionFee(data.receipt)
  const gasUsed = data.receipt?.gasUsed
  const gasLimit = data.transaction.gasLimit

  return (
    <Space direction="vertical" size={18} className="page-stack">
      <div className="page-heading">
        <div>
          <Typography.Title level={2}>Transaction</Typography.Title>
          <Typography.Text type="secondary">
            {data.block ? `${formatAge(data.block.timestamp)} in block ${data.block.number}` : 'Pending transaction'}
          </Typography.Text>
        </div>
      </div>

      <DetailList
        items={[
          { label: 'Hash', value: <HashLink value={data.transaction.hash} compact={false} /> },
          {
            label: 'Status',
            value:
              data.receipt == null ? (
                <Tag color="processing">Pending</Tag>
              ) : data.receipt.status === 1 ? (
                <Tag color="success">Success</Tag>
              ) : (
                <Tag color="error">Failed</Tag>
              ),
          },
          {
            label: 'Block',
            value:
              data.transaction.blockNumber == null ? (
                'Pending'
              ) : (
                <Link to={`/blocks/${data.transaction.blockNumber}`}>{formatInteger(data.transaction.blockNumber)}</Link>
              ),
          },
          { label: 'Confirmations', value: formatInteger(data.confirmations) },
          { label: 'Timestamp', value: data.block ? `${formatTimestamp(data.block.timestamp)} (${formatAge(data.block.timestamp)})` : 'Pending' },
          { label: 'From', value: <HashLink value={data.transaction.from} route={`/address/${data.transaction.from}`} compact={false} /> },
          {
            label: 'To',
            value: data.transaction.to ? (
              <HashLink value={data.transaction.to} route={`/address/${data.transaction.to}`} compact={false} />
            ) : (
              <Typography.Text type="secondary">Contract creation</Typography.Text>
            ),
          },
          { label: 'Value', value: `${formatEth(data.transaction.value)} ETH` },
          { label: 'Transaction Fee', value: fee == null ? 'Pending' : `${formatEth(fee, 8)} ETH` },
          { label: 'Gas Price', value: `${formatGwei(data.transaction.gasPrice)} Gwei` },
          { label: 'Gas Usage', value: gasUsed == null ? 'Pending' : `${formatInteger(gasUsed)} (${percentage(gasUsed, gasLimit)}%)` },
          { label: 'Gas Limit', value: formatInteger(gasLimit) },
          { label: 'Nonce', value: formatInteger(data.transaction.nonce) },
          { label: 'Method ID', value: <Tag>{data.methodId === '0x' ? 'Transfer' : data.methodId}</Tag> },
        ]}
      />

      <Card title="Input Data" className="detail-card">
        <Typography.Paragraph copyable className="code-block">
          {data.transaction.data}
        </Typography.Paragraph>
      </Card>

      <DecodedInputData
        data={data.transaction.data}
        methodId={data.methodId}
        to={data.transaction.to}
        value={data.transaction.value}
      />

      <TokenTransferTable
        title="Decoded token and NFT transfers"
        transfers={tokenTransfers.data}
        loading={tokenTransfers.isLoading}
      />
    </Space>
  )
}
