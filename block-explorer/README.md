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

## Features

- Dashboard with latest block, gas, transaction, and account activity.
- Blocks, transactions, addresses, and transaction detail pages.
- Decoded ERC-20, ERC-721, and ERC-1155 transfer views.
- Token and NFT activity pages at `/tokens` and `/nfts`.
- Address tabs for native transactions, token transfers, and NFT transfers.
- Contract ABI storage in the browser with read and write function panels.

## Local Development

Start a Hardhat node from the repository root:

```bash
npx hardhat node
```

Then run the explorer:

```bash
npm install
npm run dev
```

Open `http://127.0.0.1:5173/`.

Configuration:

```env
VITE_RPC_URL=http://127.0.0.1:8545
VITE_SCAN_DEPTH=1000
```

`VITE_SCAN_DEPTH` controls how many recent blocks are scanned for transactions and token events.

## Sample Token and NFT Data

From the repository root, run:

```bash
npm run seed:sample-assets:local
```

The script deploys `SampleToken` and `SampleNFT`, then submits ERC-20 transfers, NFT mints, and NFT transfers to the local node. The explorer will surface that activity on `/tokens`, `/nfts`, address pages, and transaction detail pages.
