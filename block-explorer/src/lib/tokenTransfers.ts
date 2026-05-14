import { ethers } from 'ethers'
import { defaultScanDepth, provider } from './explorer'

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

const erc20Or721TransferTopic = ethers.id('Transfer(address,address,uint256)')
const erc1155TransferSingleTopic = ethers.id('TransferSingle(address,address,address,uint256,uint256)')
const erc1155TransferBatchTopic = ethers.id('TransferBatch(address,address,address,uint256[],uint256[])')
const metadataCache = new Map<string, Promise<TokenMetadata>>()

const metadataAbi = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
]

function topicToAddress(topic: string) {
  return ethers.getAddress(`0x${topic.slice(26)}`)
}

function logIndex(log: ethers.Log) {
  return log.index ?? 0
}

function getLogId(log: ethers.Log, suffix = '0') {
  return `${log.transactionHash}-${log.index}-${suffix}`
}

function parseTransferLog(log: ethers.Log): TokenTransfer[] {
  if (log.topics[0] === erc20Or721TransferTopic) {
    const from = topicToAddress(log.topics[1])
    const to = topicToAddress(log.topics[2])

    if (log.topics.length === 4) {
      return [
        {
          blockNumber: log.blockNumber,
          from,
          id: getLogId(log),
          kind: 'ERC-721',
          logIndex: logIndex(log),
          to,
          tokenAddress: ethers.getAddress(log.address),
          tokenId: BigInt(log.topics[3]).toString(),
          transactionHash: log.transactionHash,
        },
      ]
    }

    return [
      {
        amount: BigInt(log.data),
        blockNumber: log.blockNumber,
        from,
        id: getLogId(log),
        kind: 'ERC-20',
        logIndex: logIndex(log),
        to,
        tokenAddress: ethers.getAddress(log.address),
        transactionHash: log.transactionHash,
      },
    ]
  }

  if (log.topics[0] === erc1155TransferSingleTopic) {
    const from = topicToAddress(log.topics[2])
    const to = topicToAddress(log.topics[3])
    const [tokenId, amount] = ethers.AbiCoder.defaultAbiCoder().decode(['uint256', 'uint256'], log.data)

    return [
      {
        amount,
        blockNumber: log.blockNumber,
        from,
        id: getLogId(log),
        kind: 'ERC-1155',
        logIndex: logIndex(log),
        to,
        tokenAddress: ethers.getAddress(log.address),
        tokenId: tokenId.toString(),
        transactionHash: log.transactionHash,
      },
    ]
  }

  if (log.topics[0] === erc1155TransferBatchTopic) {
    const from = topicToAddress(log.topics[2])
    const to = topicToAddress(log.topics[3])
    const [tokenIds, amounts] = ethers.AbiCoder.defaultAbiCoder().decode(['uint256[]', 'uint256[]'], log.data)

    return tokenIds.map((tokenId: bigint, index: number) => ({
      amount: amounts[index],
      blockNumber: log.blockNumber,
      from,
      id: getLogId(log, String(index)),
      kind: 'ERC-1155' as const,
      logIndex: logIndex(log),
      to,
      tokenAddress: ethers.getAddress(log.address),
      tokenId: tokenId.toString(),
      transactionHash: log.transactionHash,
    }))
  }

  return []
}

async function addTimestamps(transfers: TokenTransfer[]) {
  const blockNumbers = [...new Set(transfers.map((transfer) => transfer.blockNumber))]
  const blocks = await Promise.all(blockNumbers.map((blockNumber) => provider.getBlock(blockNumber)))
  const timestamps = new Map(blocks.filter(Boolean).map((block) => [block!.number, block!.timestamp]))

  return transfers.map((transfer) => ({
    ...transfer,
    timestamp: timestamps.get(transfer.blockNumber),
  }))
}

async function probeMetadata(address: string): Promise<TokenMetadata> {
  const normalizedAddress = ethers.getAddress(address)
  const cached = metadataCache.get(normalizedAddress)
  if (cached) return cached

  const promise = (async () => {
    const contract = new ethers.Contract(normalizedAddress, metadataAbi, provider)
    const [name, symbol, decimals] = await Promise.allSettled([
      contract.name(),
      contract.symbol(),
      contract.decimals(),
    ])

    return {
      address: normalizedAddress,
      decimals: decimals.status === 'fulfilled' ? Number(decimals.value) : undefined,
      name: name.status === 'fulfilled' ? String(name.value) : undefined,
      symbol: symbol.status === 'fulfilled' ? String(symbol.value) : undefined,
    }
  })()

  metadataCache.set(normalizedAddress, promise)
  return promise
}

async function addMetadata(transfers: TokenTransfer[]) {
  const tokenAddresses = [...new Set(transfers.map((transfer) => transfer.tokenAddress))]
  const metadata = await Promise.all(tokenAddresses.map((address) => probeMetadata(address)))
  const byAddress = new Map(metadata.map((item) => [item.address, item]))

  return transfers.map((transfer) => {
    const tokenMetadata = byAddress.get(transfer.tokenAddress)
    return {
      ...transfer,
      tokenName: tokenMetadata?.name,
      tokenDecimals: tokenMetadata?.decimals,
      tokenSymbol: tokenMetadata?.symbol,
    }
  })
}

function newestFirst(left: TokenTransfer, right: TokenTransfer) {
  if (right.blockNumber !== left.blockNumber) return right.blockNumber - left.blockNumber
  return right.logIndex - left.logIndex
}

function filterByAddress(transfers: TokenTransfer[], address?: string) {
  if (!address) return transfers
  const normalizedAddress = ethers.getAddress(address).toLowerCase()
  return transfers.filter(
    (transfer) => transfer.from.toLowerCase() === normalizedAddress || transfer.to.toLowerCase() === normalizedAddress,
  )
}

function filterByMode(transfers: TokenTransfer[], mode?: 'tokens' | 'nfts') {
  if (mode === 'tokens') return transfers.filter((transfer) => transfer.kind === 'ERC-20')
  if (mode === 'nfts') return transfers.filter((transfer) => transfer.kind === 'ERC-721' || transfer.kind === 'ERC-1155')
  return transfers
}

export async function getRecentTokenTransfers(options: {
  address?: string
  limit?: number
  mode?: 'tokens' | 'nfts'
  scanDepth?: number
} = {}) {
  const latest = await provider.getBlockNumber()
  const fromBlock = Math.max(0, latest - (options.scanDepth ?? defaultScanDepth))
  const logs = await Promise.all([
    provider.getLogs({ fromBlock, toBlock: 'latest', topics: [erc20Or721TransferTopic] }),
    provider.getLogs({ fromBlock, toBlock: 'latest', topics: [erc1155TransferSingleTopic] }),
    provider.getLogs({ fromBlock, toBlock: 'latest', topics: [erc1155TransferBatchTopic] }),
  ])

  const transfers = logs
    .flat()
    .flatMap(parseTransferLog)
    .filter((transfer) => filterByMode([transfer], options.mode).length > 0)

  const filtered = filterByAddress(transfers, options.address).sort(newestFirst).slice(0, options.limit ?? 100)
  return addMetadata(await addTimestamps(filtered))
}

export async function getTransactionTokenTransfers(transactionHash: string) {
  const receipt = await provider.getTransactionReceipt(transactionHash)
  if (!receipt) return []

  const transfers = receipt.logs.flatMap(parseTransferLog).sort(newestFirst)
  return addMetadata(await addTimestamps(transfers))
}

export async function getTokenSummaries(mode: 'tokens' | 'nfts') {
  const transfers = await getRecentTokenTransfers({ mode, limit: 500 })
  const grouped = new Map<string, TokenSummary>()

  for (const transfer of transfers) {
    const existing = grouped.get(transfer.tokenAddress)
    if (existing) {
      existing.transferCount += 1
      continue
    }

    grouped.set(transfer.tokenAddress, {
      address: transfer.tokenAddress,
      kind: transfer.kind,
      name: transfer.tokenName,
      symbol: transfer.tokenSymbol,
      transferCount: 1,
    })
  }

  return [...grouped.values()].sort((left, right) => right.transferCount - left.transferCount)
}
