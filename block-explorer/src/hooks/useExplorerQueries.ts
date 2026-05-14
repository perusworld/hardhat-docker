import { useQuery } from '@tanstack/react-query'
import {
  getAddressSummary,
  getBlockWithTransactions,
  getLatestBlocks,
  getLatestTransactions,
  getNetworkSummary,
  getTransactionDetails,
} from '../lib/explorer'
import {
  getRecentTokenTransfers,
  getTokenSummaries,
  getTransactionTokenTransfers,
} from '../lib/tokenTransfers'

const liveRefreshMs = 5_000

export function useNetworkSummary() {
  return useQuery({
    queryKey: ['network-summary'],
    queryFn: getNetworkSummary,
    refetchInterval: liveRefreshMs,
  })
}

export function useLatestBlocks(page = 1, pageSize = 12) {
  return useQuery({
    queryKey: ['latest-blocks', page, pageSize],
    queryFn: () => getLatestBlocks(page, pageSize),
    refetchInterval: liveRefreshMs,
  })
}

export function useLatestTransactions(limit = 25) {
  return useQuery({
    queryKey: ['latest-transactions', limit],
    queryFn: () => getLatestTransactions(limit),
    refetchInterval: liveRefreshMs,
  })
}

export function useBlock(blockNumber?: string) {
  return useQuery({
    queryKey: ['block', blockNumber],
    queryFn: () => getBlockWithTransactions(Number(blockNumber)),
    enabled: blockNumber != null && Number.isFinite(Number(blockNumber)),
    refetchInterval: liveRefreshMs,
  })
}

export function useTransaction(hash?: string) {
  return useQuery({
    queryKey: ['transaction', hash],
    queryFn: () => getTransactionDetails(hash ?? ''),
    enabled: Boolean(hash),
    refetchInterval: liveRefreshMs,
  })
}

export function useAddress(address?: string) {
  return useQuery({
    queryKey: ['address', address],
    queryFn: () => getAddressSummary(address ?? ''),
    enabled: Boolean(address),
    refetchInterval: liveRefreshMs,
  })
}

export function useTokenSummaries(mode: 'tokens' | 'nfts') {
  return useQuery({
    queryKey: ['token-summaries', mode],
    queryFn: () => getTokenSummaries(mode),
    refetchInterval: liveRefreshMs,
  })
}

export function useRecentTokenTransfers(options: {
  address?: string
  enabled?: boolean
  limit?: number
  mode?: 'tokens' | 'nfts'
} = {}) {
  return useQuery({
    queryKey: ['token-transfers', options],
    queryFn: () => getRecentTokenTransfers(options),
    enabled: options.enabled ?? true,
    refetchInterval: liveRefreshMs,
  })
}

export function useTransactionTokenTransfers(hash?: string) {
  return useQuery({
    queryKey: ['transaction-token-transfers', hash],
    queryFn: () => getTransactionTokenTransfers(hash ?? ''),
    enabled: Boolean(hash),
    refetchInterval: liveRefreshMs,
  })
}
