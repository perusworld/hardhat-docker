import { explorerApiUrl } from './api'

export type TokenTransferKind = 'ERC-20' | 'ERC-721' | 'ERC-1155'

export type TokenMetadata = {
  address: string
  decimals?: number
  name?: string
  symbol?: string
}

export type TokenTransfer = {
  amount?: bigint
  blockNumber: number
  from: string
  id: string
  kind: TokenTransferKind
  logIndex: number
  timestamp?: number
  to: string
  tokenAddress: string
  tokenDecimals?: number
  tokenId?: string
  tokenName?: string
  tokenSymbol?: string
  transactionHash: string
}

export type TokenSummary = TokenMetadata & {
  kind: TokenTransferKind
  transferCount: number
}

type ApiTokenTransfer = Omit<TokenTransfer, 'amount' | 'tokenDecimals' | 'tokenId' | 'tokenName' | 'tokenSymbol'> & {
  amount: string | null
  tokenDecimals: number | null
  tokenId: string | null
  tokenName: string | null
  tokenSymbol: string | null
}

type ApiTokenSummary = Omit<TokenSummary, 'decimals' | 'name' | 'symbol'> & {
  decimals: number | null
  name: string | null
  symbol: string | null
}

async function apiRequest<T>(path: string, params: Record<string, number | string | undefined> = {}) {
  const url = new URL(path, explorerApiUrl)

  for (const [key, value] of Object.entries(params)) {
    if (value != null) url.searchParams.set(key, String(value))
  }

  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Explorer API request failed: ${response.status} ${response.statusText}`)
  }

  return response.json() as Promise<T>
}

function reviveTransfer(transfer: ApiTokenTransfer): TokenTransfer {
  return {
    ...transfer,
    amount: transfer.amount == null ? undefined : BigInt(transfer.amount),
    tokenDecimals: transfer.tokenDecimals ?? undefined,
    tokenId: transfer.tokenId ?? undefined,
    tokenName: transfer.tokenName ?? undefined,
    tokenSymbol: transfer.tokenSymbol ?? undefined,
  }
}

function reviveSummary(summary: ApiTokenSummary): TokenSummary {
  return {
    ...summary,
    decimals: summary.decimals ?? undefined,
    name: summary.name ?? undefined,
    symbol: summary.symbol ?? undefined,
  }
}

export async function getRecentTokenTransfers(options: {
  address?: string
  limit?: number
  mode?: 'tokens' | 'nfts'
} = {}) {
  const endpoint = options.mode === 'nfts' ? '/api/plugins/erc721/transfers' : '/api/plugins/erc20/transfers'
  const transfers = await apiRequest<ApiTokenTransfer[]>(endpoint, {
    address: options.address,
    limit: options.limit ?? 100,
  })

  return transfers.map(reviveTransfer)
}

export async function getTransactionTokenTransfers(transactionHash: string) {
  const transfers = await apiRequest<ApiTokenTransfer[]>('/api/plugins/token-transfers', {
    transactionHash,
    limit: 500,
  })

  return transfers.map(reviveTransfer)
}

export async function getTokenSummaries(mode: 'tokens' | 'nfts') {
  const endpoint = mode === 'nfts' ? '/api/plugins/erc721/collections' : '/api/plugins/erc20/tokens'
  const summaries = await apiRequest<ApiTokenSummary[]>(endpoint)
  return summaries.map(reviveSummary)
}
