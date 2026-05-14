import Database from 'better-sqlite3'
import { databasePath } from './config.ts'

export const db = new Database(databasePath)

db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

db.exec(`
  CREATE TABLE IF NOT EXISTS indexer_state (
    chain_id TEXT PRIMARY KEY,
    latest_indexed_block INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS blocks (
    number INTEGER PRIMARY KEY,
    hash TEXT NOT NULL,
    parent_hash TEXT NOT NULL,
    timestamp INTEGER NOT NULL,
    transaction_count INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS transactions (
    hash TEXT PRIMARY KEY,
    block_number INTEGER NOT NULL,
    tx_index INTEGER NOT NULL,
    from_address TEXT NOT NULL,
    to_address TEXT,
    value TEXT NOT NULL,
    data TEXT NOT NULL,
    nonce INTEGER NOT NULL,
    gas_limit TEXT NOT NULL,
    gas_price TEXT,
    type INTEGER NOT NULL,
    timestamp INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS token_metadata (
    address TEXT PRIMARY KEY,
    kind TEXT NOT NULL,
    name TEXT,
    symbol TEXT,
    decimals INTEGER,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS token_transfers (
    id TEXT PRIMARY KEY,
    kind TEXT NOT NULL,
    token_address TEXT NOT NULL,
    from_address TEXT NOT NULL,
    to_address TEXT NOT NULL,
    amount TEXT,
    token_id TEXT,
    transaction_hash TEXT NOT NULL,
    block_number INTEGER NOT NULL,
    log_index INTEGER NOT NULL,
    timestamp INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS contract_artifacts (
    id TEXT PRIMARY KEY,
    contract_name TEXT NOT NULL,
    source_name TEXT NOT NULL,
    abi TEXT NOT NULL,
    bytecode TEXT,
    deployed_bytecode TEXT,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS contract_addresses (
    address TEXT PRIMARY KEY,
    chain_id TEXT NOT NULL,
    artifact_id TEXT NOT NULL,
    contract_name TEXT NOT NULL,
    source_name TEXT NOT NULL,
    abi TEXT NOT NULL,
    match_source TEXT NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (artifact_id) REFERENCES contract_artifacts(id)
  );

  CREATE INDEX IF NOT EXISTS idx_transactions_block_number ON transactions(block_number DESC, tx_index DESC);
  CREATE INDEX IF NOT EXISTS idx_token_transfers_kind_block ON token_transfers(kind, block_number DESC, log_index DESC);
  CREATE INDEX IF NOT EXISTS idx_token_transfers_token ON token_transfers(token_address);
  CREATE INDEX IF NOT EXISTS idx_token_transfers_from ON token_transfers(from_address);
  CREATE INDEX IF NOT EXISTS idx_token_transfers_to ON token_transfers(to_address);
  CREATE INDEX IF NOT EXISTS idx_token_transfers_tx ON token_transfers(transaction_hash);
  CREATE INDEX IF NOT EXISTS idx_contract_artifacts_name ON contract_artifacts(contract_name);
  CREATE INDEX IF NOT EXISTS idx_contract_artifacts_deployed_bytecode ON contract_artifacts(deployed_bytecode);
  CREATE INDEX IF NOT EXISTS idx_contract_addresses_chain ON contract_addresses(chain_id);
`)

export type TokenTransferRow = {
  amount: string | null
  blockNumber: number
  from: string
  id: string
  kind: 'ERC-20' | 'ERC-721' | 'ERC-1155'
  logIndex: number
  timestamp: number
  to: string
  tokenAddress: string
  tokenDecimals: number | null
  tokenId: string | null
  tokenName: string | null
  tokenSymbol: string | null
  transactionHash: string
}

export type TokenSummaryRow = {
  address: string
  decimals: number | null
  kind: 'ERC-20' | 'ERC-721' | 'ERC-1155'
  name: string | null
  symbol: string | null
  transferCount: number
}

export type ContractMetadataRow = {
  abi: string
  address: string
  artifactId: string
  chainId: string
  contractName: string
  matchSource: string
  sourceName: string
  updatedAt: number
}

export function getTokenTransfers(options: {
  address?: string
  kinds: Array<'ERC-20' | 'ERC-721' | 'ERC-1155'>
  limit?: number
  transactionHash?: string
}) {
  const filters = [`t.kind IN (${options.kinds.map(() => '?').join(', ')})`]
  const params: Array<number | string> = [...options.kinds]

  if (options.address) {
    filters.push('(t.from_address = ? OR t.to_address = ?)')
    params.push(options.address.toLowerCase(), options.address.toLowerCase())
  }

  if (options.transactionHash) {
    filters.push('t.transaction_hash = ?')
    params.push(options.transactionHash.toLowerCase())
  }

  params.push(options.limit ?? 100)

  return db
    .prepare(
      `
        SELECT
          t.id,
          t.kind,
          t.token_address AS tokenAddress,
          t.from_address AS "from",
          t.to_address AS "to",
          t.amount,
          t.token_id AS tokenId,
          t.transaction_hash AS transactionHash,
          t.block_number AS blockNumber,
          t.log_index AS logIndex,
          t.timestamp,
          m.name AS tokenName,
          m.symbol AS tokenSymbol,
          m.decimals AS tokenDecimals
        FROM token_transfers t
        LEFT JOIN token_metadata m ON m.address = t.token_address
        WHERE ${filters.join(' AND ')}
        ORDER BY t.block_number DESC, t.log_index DESC
        LIMIT ?
      `,
    )
    .all(...params) as TokenTransferRow[]
}

export function getTokenSummaries(kinds: Array<'ERC-20' | 'ERC-721' | 'ERC-1155'>) {
  return db
    .prepare(
      `
        SELECT
          t.token_address AS address,
          t.kind,
          m.name,
          m.symbol,
          m.decimals,
          COUNT(*) AS transferCount
        FROM token_transfers t
        LEFT JOIN token_metadata m ON m.address = t.token_address
        WHERE t.kind IN (${kinds.map(() => '?').join(', ')})
        GROUP BY t.token_address, t.kind
        ORDER BY transferCount DESC, MAX(t.block_number) DESC
      `,
    )
    .all(...kinds) as TokenSummaryRow[]
}

export function getContractMetadata(address: string) {
  return db
    .prepare(
      `
        SELECT
          address,
          chain_id AS chainId,
          artifact_id AS artifactId,
          contract_name AS contractName,
          source_name AS sourceName,
          abi,
          match_source AS matchSource,
          updated_at AS updatedAt
        FROM contract_addresses
        WHERE address = ?
      `,
    )
    .get(address.toLowerCase()) as ContractMetadataRow | undefined
}

export function resetIndexedChainData(chainId: string) {
  const reset = db.transaction(() => {
    db.prepare('DELETE FROM indexer_state WHERE chain_id = ?').run(chainId)
    db.prepare('DELETE FROM blocks').run()
    db.prepare('DELETE FROM transactions').run()
    db.prepare('DELETE FROM token_metadata').run()
    db.prepare('DELETE FROM token_transfers').run()
    db.prepare('DELETE FROM contract_addresses WHERE chain_id = ?').run(chainId)
  })

  reset()
}
