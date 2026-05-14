import { ethers } from 'ethers'
import { indexStartBlock, pollIntervalMs, rpcUrl } from './config.ts'
import { db, resetIndexedChainData } from './db.ts'
import { probeAndStoreMetadata } from './metadata.ts'
import { plugins } from './plugins/index.ts'
import type { IndexedTokenTransfer } from './plugins/types.ts'

type StoredTransfer = IndexedTokenTransfer & {
  blockNumber: number
  timestamp: number
}

const provider = new ethers.JsonRpcProvider(rpcUrl)

const getState = db.prepare('SELECT latest_indexed_block AS latestIndexedBlock FROM indexer_state WHERE chain_id = ?')
const setState = db.prepare(`
  INSERT INTO indexer_state (chain_id, latest_indexed_block, updated_at)
  VALUES (?, ?, ?)
  ON CONFLICT(chain_id) DO UPDATE SET
    latest_indexed_block = excluded.latest_indexed_block,
    updated_at = excluded.updated_at
`)

const insertBlock = db.prepare(`
  INSERT OR REPLACE INTO blocks (number, hash, parent_hash, timestamp, transaction_count)
  VALUES (?, ?, ?, ?, ?)
`)

const insertTransaction = db.prepare(`
  INSERT OR REPLACE INTO transactions (
    hash,
    block_number,
    tx_index,
    from_address,
    to_address,
    value,
    data,
    nonce,
    gas_limit,
    gas_price,
    type,
    timestamp
  )
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`)

const insertTransfer = db.prepare(`
  INSERT OR REPLACE INTO token_transfers (
    id,
    kind,
    token_address,
    from_address,
    to_address,
    amount,
    token_id,
    transaction_hash,
    block_number,
    log_index,
    timestamp
  )
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`)

const storeBlock = db.transaction(
  (
    chainId: string,
    block: ethers.Block,
    transactions: ethers.TransactionResponse[],
    transfers: StoredTransfer[],
  ) => {
    insertBlock.run(block.number, block.hash, block.parentHash, block.timestamp, transactions.length)

    for (const transaction of transactions) {
      insertTransaction.run(
        transaction.hash.toLowerCase(),
        block.number,
        transaction.index,
        transaction.from.toLowerCase(),
        transaction.to?.toLowerCase() ?? null,
        transaction.value.toString(),
        transaction.data,
        transaction.nonce,
        transaction.gasLimit.toString(),
        transaction.gasPrice?.toString() ?? null,
        transaction.type,
        block.timestamp,
      )
    }

    for (const transfer of transfers) {
      insertTransfer.run(
        transfer.id,
        transfer.kind,
        transfer.tokenAddress.toLowerCase(),
        transfer.from.toLowerCase(),
        transfer.to.toLowerCase(),
        transfer.amount?.toString() ?? null,
        transfer.tokenId ?? null,
        transfer.transactionHash.toLowerCase(),
        transfer.blockNumber,
        transfer.logIndex,
        transfer.timestamp,
      )
    }

    setState.run(chainId, block.number, Math.floor(Date.now() / 1000))
  },
)

async function getChainId() {
  const network = await provider.getNetwork()
  return network.chainId.toString()
}

function getLatestIndexedBlock(chainId: string) {
  const row = getState.get(chainId) as { latestIndexedBlock: number } | undefined
  return row?.latestIndexedBlock ?? indexStartBlock - 1
}

function decodeTransfers(receipt: ethers.TransactionReceipt, blockNumber: number, timestamp: number) {
  const transfers: StoredTransfer[] = []

  for (const log of receipt.logs) {
    for (const plugin of plugins) {
      transfers.push(
        ...plugin.decodeLog(log).map((transfer) => ({
          ...transfer,
          blockNumber,
          timestamp,
        })),
      )
    }
  }

  return transfers
}

async function indexBlock(chainId: string, blockNumber: number) {
  const block = await provider.getBlock(blockNumber, true)
  if (!block) return

  const transactions = [...(block.prefetchedTransactions ?? [])]
  const receipts = await Promise.all(transactions.map((transaction) => provider.getTransactionReceipt(transaction.hash)))
  const transfers = receipts.flatMap((receipt) => (receipt ? decodeTransfers(receipt, block.number, block.timestamp) : []))

  storeBlock(chainId, block, transactions, transfers)

  const tokenKinds = new Map<string, StoredTransfer['kind']>()
  for (const transfer of transfers) {
    if (!tokenKinds.has(transfer.tokenAddress)) {
      tokenKinds.set(transfer.tokenAddress, transfer.kind)
    }
  }

  await Promise.all([...tokenKinds].map(([address, kind]) => probeAndStoreMetadata(provider, address.toLowerCase(), kind)))
}

let inFlight: Promise<void> | undefined

export async function syncToLatest() {
  if (inFlight) return inFlight

  inFlight = (async () => {
    const chainId = await getChainId()
    const latest = await provider.getBlockNumber()
    let latestIndexed = getLatestIndexedBlock(chainId)

    if (latestIndexed > latest) {
      resetIndexedChainData(chainId)
      latestIndexed = indexStartBlock - 1
    }

    for (let blockNumber = latestIndexed + 1; blockNumber <= latest; blockNumber += 1) {
      await indexBlock(chainId, blockNumber)
    }
  })()

  try {
    await inFlight
  } finally {
    inFlight = undefined
  }
}

export function startIndexer() {
  void syncToLatest().catch((error: unknown) => {
    console.error('Initial index failed', error)
  })

  const interval = setInterval(() => {
    void syncToLatest().catch((error: unknown) => {
      console.error('Background index failed', error)
    })
  }, pollIntervalMs)

  return () => clearInterval(interval)
}

export async function getIndexerStatus() {
  const chainId = await getChainId()
  const latest = await provider.getBlockNumber()
  const latestIndexed = getLatestIndexedBlock(chainId)

  return {
    chainId,
    latestBlock: latest,
    latestIndexedBlock: latestIndexed,
    rpcUrl,
  }
}
