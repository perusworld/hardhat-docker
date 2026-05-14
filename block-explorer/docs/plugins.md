# Adding Explorer Plugins

HardhatScan plugins are source-level modules today. A plugin can index custom contract events in the backend, expose API endpoints, and add UI views that consume those endpoints.

This is intentionally simple for local Hardhat workflows. There is no runtime plugin loading yet; add the plugin to the source tree, register it, and rebuild.

## Current Plugin Model

The backend plugin contract lives in `server/plugins/types.ts`:

```ts
export type ExplorerPlugin = {
  id: string
  name: string
  eventTopics: string[]
  decodeLog(log: ethers.Log): IndexedTokenTransfer[]
}
```

The built-in plugins are:

- `server/plugins/erc20.ts`
- `server/plugins/nfts.ts`

They are registered in `server/plugins/index.ts`.

## What Plugins Can Do Today

Plugins can:

- subscribe to one or more event topics
- decode matching logs while the background indexer scans blocks
- store decoded rows in SQLite
- expose API endpoints from `server/index.ts`
- add React pages, tabs, or table panels that call those APIs

Useful plugin examples:

- marketplace fills, listings, cancels, and settlement events
- bridge deposits and withdrawals
- staking deposits, withdrawals, rewards, and validator metadata
- ERC-20 or NFT metadata extensions
- transaction detail enrichment for known contract methods

## Backend Flow

```text
Hardhat JSON-RPC
  -> server/indexer.ts
  -> registered plugins decode logs
  -> SQLite tables in .data/explorer.sqlite
  -> server/index.ts API endpoints
  -> React UI
```

The UI should not scan logs for plugin data. It should call the API server.

## Add a Custom Event Plugin

Example contract event:

```solidity
event OrderFilled(
  bytes32 indexed orderId,
  address indexed maker,
  address indexed taker,
  address token,
  uint256 amount
);
```

Create a plugin file:

```ts
// server/plugins/orders.ts
import { ethers } from 'ethers'
import type { ExplorerPlugin } from './types.ts'

export const orderFilledTopic = ethers.id('OrderFilled(bytes32,address,address,address,uint256)')

const abi = ethers.AbiCoder.defaultAbiCoder()

export type IndexedOrderFill = {
  amount: string
  id: string
  maker: string
  orderId: string
  taker: string
  token: string
  transactionHash: string
}

export const ordersPlugin: ExplorerPlugin = {
  id: 'orders',
  name: 'Orders',
  eventTopics: [orderFilledTopic],
  decodeLog(log) {
    if (log.topics[0] !== orderFilledTopic) return []

    const [token, amount] = abi.decode(['address', 'uint256'], log.data)

    // The current shared plugin type is token-transfer shaped. For custom
    // tables, decode in the plugin and store through a plugin-specific indexer
    // function or extend the plugin interface.
    return []
  },
}
```

For non-token data, add a plugin-specific table and storage function instead of forcing the data into `token_transfers`.

## Add a SQLite Table

Add schema in `server/db.ts`:

```sql
CREATE TABLE IF NOT EXISTS order_fills (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  maker TEXT NOT NULL,
  taker TEXT NOT NULL,
  token TEXT NOT NULL,
  amount TEXT NOT NULL,
  transaction_hash TEXT NOT NULL,
  block_number INTEGER NOT NULL,
  log_index INTEGER NOT NULL,
  timestamp INTEGER NOT NULL
);
```

Add read helpers in `server/db.ts`:

```ts
export function getOrderFills(limit = 100) {
  return db
    .prepare(
      `
        SELECT *
        FROM order_fills
        ORDER BY block_number DESC, log_index DESC
        LIMIT ?
      `,
    )
    .all(limit)
}
```

For writes, either add prepared statements in `server/indexer.ts` or extract plugin storage into a dedicated module such as `server/plugins/ordersStorage.ts`.

## Register the Plugin

Add the plugin to `server/plugins/index.ts`:

```ts
import { ordersPlugin } from './orders.ts'

export const plugins = [erc20Plugin, nftPlugin, ordersPlugin]
```

The indexer will now see the plugin when processing receipts.

## Add API Endpoints

Add a route in `server/index.ts`:

```ts
import { getOrderFills } from './db.ts'

const routes: Record<string, RouteHandler> = {
  // ...
  '/api/plugins/orders/fills': async (requestUrl) => {
    await syncToLatest()
    return getOrderFills(limitParam(requestUrl))
  },
}
```

Use plugin-scoped paths:

```text
/api/plugins/orders/fills
/api/plugins/orders/stats
/api/plugins/orders/by-address?address=0x...
/api/plugins/orders/by-transaction?transactionHash=0x...
```

## Add a UI View

Add an API client:

```ts
// src/lib/orders.ts
const apiUrl = import.meta.env.VITE_EXPLORER_API_URL ?? 'http://127.0.0.1:8787'

export async function getOrderFills() {
  const response = await fetch(`${apiUrl}/api/plugins/orders/fills`)
  if (!response.ok) throw new Error('Failed to load order fills')
  return response.json()
}
```

Add a query hook:

```ts
// src/hooks/useExplorerQueries.ts
export function useOrderFills() {
  return useQuery({
    queryKey: ['plugin', 'orders', 'fills'],
    queryFn: getOrderFills,
    refetchInterval: liveRefreshMs,
  })
}
```

Add a page under `src/pages`, then register the route in `src/App.tsx` and navigation in `src/components/ExplorerLayout.tsx`.

## Enhance Transaction Details

The transaction detail page already supports Etherscan-style decoded input data when the receiving contract has a known ABI. The decoder uses the transaction `to` address, artifact metadata from the backend when available, browser-saved ABI metadata as a fallback, and `ethers.Interface.parseTransaction` to render:

- function selector
- function signature
- parameter names
- parameter ABI types
- decoded values

For local Hardhat projects, the backend reads compile artifacts from `EXPLORER_ARTIFACTS_PATH` and Ignition deployment maps from `EXPLORER_IGNITION_DEPLOYMENTS_PATH`. With the default repo layout, those point at `../artifacts` and `../ignition/deployments` from `block-explorer`, so there is no artifact copy step. The backend can match contracts by Ignition deployment address first, then by deployed bytecode.

The contract read/write workspace uses the same ABI lookup path. Browser-saved ABIs are still available for contracts that do not have project artifacts, but they are no longer required for contracts compiled in the local Hardhat project.

For richer domain-specific metadata, add plugin endpoints and panels beside the generic decoded input section.

For plugin-specific transaction metadata, add an endpoint that filters by transaction hash:

```text
GET /api/plugins/orders/by-transaction?transactionHash=0x...
```

Then add a panel to `src/pages/TransactionDetail.tsx`:

```tsx
const orderFills = useOrderFillsForTransaction(hash)

{orderFills.data?.length ? (
  <OrderFillTable title="Order fills" fills={orderFills.data} />
) : null}
```

This is the right pattern for surfacing domain metadata beside the base transaction fields without hardcoding every custom contract into the core transaction model.

## Plugin Design Rules

- Keep raw RPC scanning in the backend.
- Store plugin data in SQLite as strings for large integers.
- Use lowercase addresses and transaction hashes for indexed lookup columns.
- Keep UI reads API-based and refresh through TanStack Query.
- Use plugin-scoped API paths under `/api/plugins/<plugin-id>/...`.
- Do not put local database files in Git; `.data` is ignored.

## Near-Term Improvements

The current plugin interface is token-transfer focused. Before many custom plugins are added, the next useful refinement is:

```ts
export type ExplorerPlugin = {
  id: string
  name: string
  eventTopics: string[]
  migrate?(db: Database.Database): void
  handleLog?(context: LogContext): Promise<void> | void
  routes?: Record<string, RouteHandler>
}
```

That would let plugins own their schema, writes, and API routes instead of editing `db.ts`, `indexer.ts`, and `index.ts` separately.
