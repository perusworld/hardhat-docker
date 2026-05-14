import { Route, Routes } from 'react-router-dom'
import ExplorerLayout from './components/ExplorerLayout'
import AddressDetail from './pages/AddressDetail'
import BlockDetail from './pages/BlockDetail'
import BlocksPage from './pages/BlocksPage'
import Dashboard from './pages/Dashboard'
import NftsPage from './pages/NftsPage'
import NotFound from './pages/NotFound'
import TokensPage from './pages/TokensPage'
import TransactionDetail from './pages/TransactionDetail'
import TransactionsPage from './pages/TransactionsPage'

function App() {
  return (
    <Routes>
      <Route element={<ExplorerLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="blocks" element={<BlocksPage />} />
        <Route path="blocks/:blockNumber" element={<BlockDetail />} />
        <Route path="block/:blockNumber" element={<BlockDetail />} />
        <Route path="txs" element={<TransactionsPage />} />
        <Route path="tokens" element={<TokensPage />} />
        <Route path="nfts" element={<NftsPage />} />
        <Route path="tx/:hash" element={<TransactionDetail />} />
        <Route path="address/:address" element={<AddressDetail />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}

export default App
