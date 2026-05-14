import { ReloadOutlined } from '@ant-design/icons'
import { Button, Card, Col, Result, Row, Space, Statistic, Typography } from 'antd'
import BlockTable from '../components/BlockTable'
import TransactionTable from '../components/TransactionTable'
import { useLatestBlocks, useLatestTransactions, useNetworkSummary } from '../hooks/useExplorerQueries'
import { formatGwei, formatInteger } from '../lib/format'

export default function Dashboard() {
  const network = useNetworkSummary()
  const blocks = useLatestBlocks(1, 8)
  const transactions = useLatestTransactions(12)
  const isError = network.isError || blocks.isError || transactions.isError

  if (isError) {
    return (
      <Result
        status="warning"
        title="Hardhat node is not responding"
        subTitle="The explorer expects a JSON-RPC node at the configured VITE_RPC_URL."
        extra={<Button icon={<ReloadOutlined />} onClick={() => window.location.reload()}>Retry</Button>}
      />
    )
  }

  return (
    <Space direction="vertical" size={18} className="page-stack">
      <div className="page-heading">
        <div>
          <Typography.Title level={2}>Local chain overview</Typography.Title>
          <Typography.Text type="secondary">Live block and transaction activity from the running Hardhat node.</Typography.Text>
        </div>
        <Button icon={<ReloadOutlined />} onClick={() => void Promise.all([network.refetch(), blocks.refetch(), transactions.refetch()])}>
          Refresh
        </Button>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} md={12} xl={6}>
          <Card>
            <Statistic title="Chain ID" value={network.data?.chainId.toString() ?? '-'} loading={network.isLoading} />
          </Card>
        </Col>
        <Col xs={24} md={12} xl={6}>
          <Card>
            <Statistic title="Latest Block" value={formatInteger(network.data?.blockNumber)} loading={network.isLoading} />
          </Card>
        </Col>
        <Col xs={24} md={12} xl={6}>
          <Card>
            <Statistic title="Gas Price" value={`${formatGwei(network.data?.gasPrice)} Gwei`} loading={network.isLoading} />
          </Card>
        </Col>
        <Col xs={24} md={12} xl={6}>
          <Card>
            <Statistic title="Recent Transactions" value={formatInteger(transactions.data?.length)} loading={transactions.isLoading} />
          </Card>
        </Col>
      </Row>

      <BlockTable title="Latest Blocks" blocks={blocks.data?.blocks} loading={blocks.isLoading} />
      <TransactionTable title="Latest Transactions" transactions={transactions.data} loading={transactions.isLoading} />
    </Space>
  )
}
