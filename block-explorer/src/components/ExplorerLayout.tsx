import {
  AppstoreOutlined,
  BarsOutlined,
  BlockOutlined,
  CrownOutlined,
  SearchOutlined,
  TransactionOutlined,
  WalletOutlined,
} from '@ant-design/icons'
import { Alert, Button, ConfigProvider, Input, Layout, Menu, Space, Typography, message } from 'antd'
import { useMemo, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { ethers } from 'ethers'
import { rpcUrl } from '../lib/explorer'

const { Header, Content, Sider } = Layout

export default function ExplorerLayout() {
  const [query, setQuery] = useState('')
  const location = useLocation()
  const navigate = useNavigate()
  const [messageApi, contextHolder] = message.useMessage()

  const selectedKey = useMemo(() => {
    if (location.pathname.startsWith('/blocks') || location.pathname.startsWith('/block')) return 'blocks'
    if (location.pathname.startsWith('/tx')) return 'txs'
    if (location.pathname.startsWith('/tokens')) return 'tokens'
    if (location.pathname.startsWith('/nfts')) return 'nfts'
    if (location.pathname.startsWith('/address')) return ''
    return 'dashboard'
  }, [location.pathname])

  const runSearch = () => {
    const trimmed = query.trim()
    if (!trimmed) return

    if (/^\d+$/.test(trimmed)) {
      navigate(`/blocks/${trimmed}`)
      return
    }

    if (/^0x([A-Fa-f0-9]{64})$/.test(trimmed)) {
      navigate(`/tx/${trimmed}`)
      return
    }

    if (ethers.isAddress(trimmed)) {
      navigate(`/address/${trimmed}`)
      return
    }

    messageApi.warning('Search by block number, transaction hash, or address.')
  }

  return (
    <ConfigProvider
      theme={{
        token: {
          borderRadius: 6,
          colorPrimary: '#1677ff',
          fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        },
      }}
    >
      {contextHolder}
      <Layout className="app-shell">
        <Sider breakpoint="lg" collapsedWidth="0" className="app-sider" width={232}>
          <div className="brand">
            <BlockOutlined />
            <span>HardhatScan</span>
          </div>
          <Menu
            mode="inline"
            selectedKeys={selectedKey ? [selectedKey] : []}
            items={[
              { key: 'dashboard', icon: <AppstoreOutlined />, label: 'Dashboard', onClick: () => navigate('/') },
              { key: 'blocks', icon: <BarsOutlined />, label: 'Blocks', onClick: () => navigate('/blocks') },
              { key: 'txs', icon: <TransactionOutlined />, label: 'Transactions', onClick: () => navigate('/txs') },
              { key: 'tokens', icon: <WalletOutlined />, label: 'Tokens', onClick: () => navigate('/tokens') },
              { key: 'nfts', icon: <CrownOutlined />, label: 'NFTs', onClick: () => navigate('/nfts') },
            ]}
          />
        </Sider>
        <Layout>
          <Header className="app-header">
            <Space.Compact className="search-bar">
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onPressEnter={runSearch}
                placeholder="Block number, transaction hash, or address"
                allowClear
              />
              <Button type="primary" icon={<SearchOutlined />} onClick={runSearch} aria-label="Search" />
            </Space.Compact>
          </Header>
          <Content className="app-content">
            <Alert
              className="rpc-alert"
              type="info"
              showIcon
              message={
                <Typography.Text>
                  Connected to <Typography.Text code>{rpcUrl}</Typography.Text>
                </Typography.Text>
              }
            />
            <Outlet />
          </Content>
        </Layout>
      </Layout>
    </ConfigProvider>
  )
}
