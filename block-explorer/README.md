# HardhatScan

A modern local block explorer for a running Hardhat JSON-RPC node.

HardhatScan is the canonical explorer UI in this repo. It replaced the older Create React App explorer and lives at `block-explorer`.

## Stack

- Vite
- React 19
- TypeScript
- Ant Design
- TanStack Query
- ethers 6
- better-sqlite3

## Features

- Dashboard with latest block, gas, transaction, and account activity.
- Blocks, transactions, addresses, and transaction detail pages.
- Background SQLite indexing for decoded ERC-20, ERC-721, and ERC-1155 transfers.
- Token and NFT activity pages at `/tokens` and `/nfts`.
- Address tabs for native transactions, token transfers, and NFT transfers.
- Etherscan-style decoded transaction input data from Hardhat artifacts, with browser-saved ABI fallback.
- Contract read and write function panels backed by artifact ABIs, with optional browser-saved ABI fallback.

## Local Development

Start a Hardhat node from the repository root:

```bash
npx hardhat node
```

For normal local usage, build the UI and run the backend server:

```bash
cd block-explorer
npm install
npm run serve
```

Open `http://127.0.0.1:8787/`. The backend serves both `/api/*` and the built React UI from `dist`.

If `npm run serve` fails with a `better-sqlite3` `NODE_MODULE_VERSION` mismatch after changing Node.js versions, rebuild the native dependency:

```bash
npm rebuild better-sqlite3
```

For active frontend development, run the API server and Vite separately so Vite can provide hot module reload:

```bash
cd block-explorer
npm run dev:server
```

In another terminal:

```bash
npm run dev
```

Open `http://127.0.0.1:5173/`. Vite proxies `/api` requests to `http://127.0.0.1:8787/`.

Configuration:

```env
VITE_RPC_URL=http://127.0.0.1:8545
VITE_SCAN_DEPTH=1000
VITE_EXPLORER_API_URL=http://127.0.0.1:8787
EXPLORER_API_PORT=8787
EXPLORER_API_HOST=127.0.0.1
EXPLORER_DB_PATH=.data/explorer.sqlite
EXPLORER_INDEX_START_BLOCK=0
EXPLORER_ARTIFACTS_PATH=../artifacts
EXPLORER_IGNITION_DEPLOYMENTS_PATH=../ignition/deployments
EXPLORER_ADDRESS_LABELS_PATH=../address-labels.env
EXPLORER_STATIC_PATH=dist
EXPLORER_SERVE_STATIC=true
```

`VITE_SCAN_DEPTH` is still used by the browser-side block, transaction, and address views. Token and NFT views read from the API server, which indexes from `EXPLORER_INDEX_START_BLOCK` into the SQLite file at `EXPLORER_DB_PATH`. `VITE_EXPLORER_API_URL` is optional; when it is not set, the browser calls the same origin that served the UI.

The API server reads Hardhat compile artifacts at runtime from `EXPLORER_ARTIFACTS_PATH` and Ignition deployment address maps from `EXPLORER_IGNITION_DEPLOYMENTS_PATH`. No copy step is required for the standard repo layout. Compile contracts in the root project, keep the API server pointed at those directories, and the transaction detail page can decode known contract calls after the backend matches the recipient contract by Ignition deployment or deployed bytecode.

## Address Labels

The explorer can show ENS-like friendly names beside addresses from a local labels file. Copy the root example file and edit it for your project:

```bash
cp ../address-labels.example.env ../address-labels.env
```

Each non-comment line is `address=label`:

```env
0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266=Hardhat Deployer
0x70997970c51812dc3a010c7d01b50e0d17dc79c8=Alice
```

The backend reads `EXPLORER_ADDRESS_LABELS_PATH` at runtime and refreshes labels when the file changes. Labels appear anywhere the shared address link component is used, including transaction from/to fields, block miner, token transfers, token contracts, and address details.

## Backend and Plugins

The backend lives in `server` and keeps token/NFT indexing out of the browser:

```text
server/
  index.ts              HTTP API
  indexer.ts            JSON-RPC block, receipt, and log indexer
  db.ts                 SQLite schema and read queries
  artifacts.ts          Hardhat artifact and Ignition deployment discovery
  metadata.ts           ERC metadata probing
  plugins/
    erc20.ts            ERC-20 Transfer decoder
    nfts.ts             ERC-721 and ERC-1155 Transfer decoder
    index.ts            plugin registry
    types.ts            plugin contract
```

Plugin APIs:

```text
GET /api/status
GET /api/address-labels
GET /api/address-labels/:address
GET /api/contracts/:address/metadata
GET /api/contracts/rescan-artifacts
GET /api/plugins/erc20/tokens
GET /api/plugins/erc20/transfers
GET /api/plugins/erc721/collections
GET /api/plugins/erc721/transfers
GET /api/plugins/token-transfers?transactionHash=0x...
```

For now plugins are source-level modules registered in `server/plugins/index.ts`. A custom contract plugin should expose event topics and a `decodeLog` function, then add API reads for its indexed tables.

See [Adding Explorer Plugins](docs/plugins.md) for a step-by-step guide to adding custom indexed views and transaction metadata panels.

## Sample Token and NFT Data

From the repository root, run:

```bash
npm run seed:sample-assets:local
```

The script deploys `SampleToken` and `SampleNFT`, then submits ERC-20 transfers, NFT mints, and NFT transfers to the local node. The explorer will surface that activity on `/tokens`, `/nfts`, address pages, and transaction detail pages.
