import { Result, Space, Spin, Tabs, Tag, Typography } from 'antd'
import { ethers } from 'ethers'
import { useParams } from 'react-router-dom'
import ContractWorkspace from '../components/ContractWorkspace'
import DetailList from '../components/DetailList'
import HashLink from '../components/HashLink'
import TokenTransferTable from '../components/TokenTransferTable'
import TransactionTable from '../components/TransactionTable'
import { useAddress, useRecentTokenTransfers } from '../hooks/useExplorerQueries'
import { formatEth, formatInteger } from '../lib/format'

export default function AddressDetail() {
  const { address } = useParams()
  const isValid = Boolean(address && ethers.isAddress(address))
  const { data, isError, isLoading } = useAddress(isValid ? address : undefined)
  const tokenTransfers = useRecentTokenTransfers({ address, enabled: isValid, mode: 'tokens', limit: 100 })
  const nftTransfers = useRecentTokenTransfers({ address, enabled: isValid, mode: 'nfts', limit: 100 })

  if (!isValid) {
    return <Result status="warning" title="Invalid address" subTitle={address} />
  }

  if (isLoading) return <Spin fullscreen />

  if (isError || !data) {
    return <Result status="404" title="Address not found" subTitle={`No address data found for ${address}.`} />
  }

  const isContract = data.code !== '0x'

  return (
    <Space direction="vertical" size={18} className="page-stack">
      <div className="page-heading">
        <div>
          <Typography.Title level={2}>Address</Typography.Title>
          <Typography.Text type="secondary">{isContract ? 'Contract account' : 'Externally owned account'}</Typography.Text>
        </div>
      </div>

      <DetailList
        items={[
          { label: 'Address', value: <HashLink value={data.address} compact={false} /> },
          { label: 'Type', value: <Tag color={isContract ? 'purple' : 'blue'}>{isContract ? 'Contract' : 'EOA'}</Tag> },
          { label: 'Balance', value: `${formatEth(data.balance, 8)} ETH` },
          { label: 'Nonce', value: formatInteger(data.nonce) },
          { label: 'Recent Transactions', value: formatInteger(data.transactionCount) },
          { label: 'Bytecode', value: isContract ? `${formatInteger((data.code.length - 2) / 2)} bytes` : 'None' },
        ]}
      />

      {isContract && <ContractWorkspace address={data.address} bytecode={data.code} />}

      <Tabs
        className="activity-tabs"
        items={[
          {
            key: 'transactions',
            label: 'Transactions',
            children: <TransactionTable title="Recent address transactions" transactions={data.transactions} loading={false} />,
          },
          {
            key: 'token-transfers',
            label: 'Token Transfers',
            children: (
              <TokenTransferTable
                title="Recent token transfers"
                transfers={tokenTransfers.data}
                loading={tokenTransfers.isLoading}
              />
            ),
          },
          {
            key: 'nft-transfers',
            label: 'NFT Transfers',
            children: (
              <TokenTransferTable
                title="Recent NFT transfers"
                transfers={nftTransfers.data}
                loading={nftTransfers.isLoading}
              />
            ),
          },
        ]}
      />
    </Space>
  )
}
