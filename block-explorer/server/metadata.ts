import { ethers } from 'ethers'
import { db } from './db.ts'
import type { TokenTransferKind } from './plugins/types.ts'

const metadataAbi = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
]

const upsertMetadata = db.prepare(`
  INSERT INTO token_metadata (address, kind, name, symbol, decimals, updated_at)
  VALUES (?, ?, ?, ?, ?, ?)
  ON CONFLICT(address) DO UPDATE SET
    kind = excluded.kind,
    name = excluded.name,
    symbol = excluded.symbol,
    decimals = excluded.decimals,
    updated_at = excluded.updated_at
`)

export async function probeAndStoreMetadata(
  provider: ethers.JsonRpcProvider,
  tokenAddress: string,
  kind: TokenTransferKind,
) {
  const contract = new ethers.Contract(tokenAddress, metadataAbi, provider)
  const [name, symbol, decimals] = await Promise.allSettled([
    contract.name(),
    contract.symbol(),
    kind === 'ERC-20' ? contract.decimals() : Promise.resolve(undefined),
  ])

  upsertMetadata.run(
    tokenAddress.toLowerCase(),
    kind,
    name.status === 'fulfilled' ? String(name.value) : null,
    symbol.status === 'fulfilled' ? String(symbol.value) : null,
    decimals.status === 'fulfilled' && decimals.value != null ? Number(decimals.value) : null,
    Math.floor(Date.now() / 1000),
  )
}
