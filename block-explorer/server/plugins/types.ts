import type { ethers } from 'ethers'

export type TokenTransferKind = 'ERC-20' | 'ERC-721' | 'ERC-1155'

export type IndexedTokenTransfer = {
  amount?: bigint
  from: string
  id: string
  kind: TokenTransferKind
  logIndex: number
  to: string
  tokenAddress: string
  tokenId?: string
  transactionHash: string
}

export type ExplorerPlugin = {
  id: string
  name: string
  eventTopics: string[]
  decodeLog(log: ethers.Log): IndexedTokenTransfer[]
}
