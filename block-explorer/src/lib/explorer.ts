import { ethers } from 'ethers'

export const rpcUrl = import.meta.env.VITE_RPC_URL ?? 'http://127.0.0.1:8545'
export const defaultScanDepth = Number(import.meta.env.VITE_SCAN_DEPTH ?? 1000)

export const provider = new ethers.JsonRpcProvider(rpcUrl)

export type ExplorerBlock = ethers.Block & {
  prefetchedTransactions?: ethers.TransactionResponse[]
}

export type ExplorerTransaction = {
  blockNumber: number | null
  data: string
  from: string
  gasLimit: bigint
  gasPrice: bigint | null
  hash: string
  nonce: number
  timestamp?: number
  to: string | null
  type: number
  value: bigint
}

export type TransactionDetails = {
  transaction: ethers.TransactionResponse
  receipt: ethers.TransactionReceipt | null
  block: ethers.Block | null
  confirmations: number
  methodId: string
}

export type AddressSummary = {
  address: string
  balance: bigint
  nonce: number
  code: string
  transactionCount: number
  transactions: ExplorerTransaction[]
}

export function toExplorerTransaction(transaction: ethers.TransactionResponse, timestamp?: number): ExplorerTransaction {
  return {
    blockNumber: transaction.blockNumber,
    data: transaction.data,
    from: transaction.from,
    gasLimit: transaction.gasLimit,
    gasPrice: transaction.gasPrice,
    hash: transaction.hash,
    nonce: transaction.nonce,
    timestamp,
    to: transaction.to,
    type: transaction.type,
    value: transaction.value,
  }
}

async function getBlocksDescending(latest: number, scanDepth: number) {
  const blockNumbers = []
  const earliest = Math.max(0, latest - scanDepth)

  for (let blockNumber = latest; blockNumber >= earliest; blockNumber -= 1) {
    blockNumbers.push(blockNumber)
  }

  const batchSize = 40
  const blocks: ExplorerBlock[] = []

  for (let index = 0; index < blockNumbers.length; index += batchSize) {
    const batch = blockNumbers.slice(index, index + batchSize)
    blocks.push(...(await Promise.all(batch.map((blockNumber) => getBlockWithTransactions(blockNumber)))))
  }

  return blocks.sort((left, right) => right.number - left.number)
}

export async function getNetworkSummary() {
  const [network, blockNumber, feeData] = await Promise.all([
    provider.getNetwork(),
    provider.getBlockNumber(),
    provider.getFeeData(),
  ])

  return {
    chainId: network.chainId,
    name: network.name,
    blockNumber,
    gasPrice: feeData.gasPrice,
  }
}

export async function getBlockWithTransactions(blockNumber: number | string) {
  const block = (await provider.getBlock(blockNumber, true)) as ExplorerBlock | null
  if (!block) throw new Error(`Block ${blockNumber} was not found`)
  return block
}

export async function getLatestBlocks(page = 1, pageSize = 12) {
  const latest = await provider.getBlockNumber()
  const start = Math.max(latest - (page - 1) * pageSize, 0)
  const end = Math.max(start - pageSize + 1, 0)
  const blockNumbers = []

  for (let blockNumber = start; blockNumber >= end; blockNumber -= 1) {
    blockNumbers.push(blockNumber)
  }

  const blocks = await Promise.all(blockNumbers.map((blockNumber) => getBlockWithTransactions(blockNumber)))
  return { blocks, latest }
}

export async function getLatestTransactions(limit = 25, scanDepth = defaultScanDepth) {
  const latest = await provider.getBlockNumber()
  const transactions: ExplorerTransaction[] = []
  const blocks = await getBlocksDescending(latest, scanDepth)

  for (const block of blocks) {
    const blockTransactions = [...(block.prefetchedTransactions ?? [])].sort((left, right) => right.index - left.index)

    for (const transaction of blockTransactions) {
      transactions.push(toExplorerTransaction(transaction, block.timestamp))
      if (transactions.length >= limit) return transactions
    }
  }

  return transactions
}

export async function getTransactionDetails(hash: string): Promise<TransactionDetails> {
  const [transaction, receipt] = await Promise.all([
    provider.getTransaction(hash),
    provider.getTransactionReceipt(hash),
  ])

  if (!transaction) throw new Error(`Transaction ${hash} was not found`)

  const blockNumber = receipt?.blockNumber ?? transaction.blockNumber
  const [block, latest] = await Promise.all([
    blockNumber == null ? null : provider.getBlock(blockNumber),
    provider.getBlockNumber(),
  ])

  return {
    transaction,
    receipt,
    block,
    confirmations: blockNumber == null ? 0 : Math.max(latest - blockNumber, 0),
    methodId: transaction.data === '0x' ? '0x' : transaction.data.slice(0, 10),
  }
}

export async function getAddressSummary(address: string, scanDepth = defaultScanDepth): Promise<AddressSummary> {
  const normalizedAddress = ethers.getAddress(address)
  const [balance, nonce, code, latest] = await Promise.all([
    provider.getBalance(normalizedAddress),
    provider.getTransactionCount(normalizedAddress),
    provider.getCode(normalizedAddress),
    provider.getBlockNumber(),
  ])

  const transactions: ExplorerTransaction[] = []
  const blocks = await getBlocksDescending(latest, scanDepth)

  for (const block of blocks) {
    const blockTransactions = [...(block.prefetchedTransactions ?? [])].sort((left, right) => right.index - left.index)
    const matches = blockTransactions.filter((transaction) => {
      const fromMatches = transaction.from.toLowerCase() === normalizedAddress.toLowerCase()
      const toMatches = transaction.to?.toLowerCase() === normalizedAddress.toLowerCase()
      return fromMatches || toMatches
    })

    transactions.push(...matches.map((transaction) => toExplorerTransaction(transaction, block.timestamp)))
  }

  return {
    address: normalizedAddress,
    balance,
    nonce,
    code,
    transactionCount: transactions.length,
    transactions,
  }
}

export function getTransactionFee(receipt?: ethers.TransactionReceipt | null) {
  if (!receipt) return null
  return receipt.gasUsed * receipt.gasPrice
}
