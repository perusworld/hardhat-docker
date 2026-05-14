# Hardhat Docker

Run a Hardhat 3 node in Docker. Default: zero fees, auto mining, chain ID 31337.

This repo follows the current [Hardhat 3 sample layout](https://hardhat.org/docs/getting-started): Solidity **profiles**, **Ignition** modules, **Mocha + ethers** TypeScript tests, optional **Foundry-style** Solidity tests (`*.t.sol`), and extra simulated networks (`hardhatMainnet`, `hardhatOp`) plus **Sepolia** via configuration variables.

## Environment variables (node in Docker)

| Variable | Default | Description |
|----------|---------|-------------|
| `CHAIN_ID` | `31337` | Chain ID of the node |
| `AUTO_MINE` | `true` | Set to `false` to disable automine |
| `MINE_INTERVAL` | `0` | If > 0 and automine off, mine a block every N ms |
| `HARDHAT_NODE_LOGGING` | `true` | Set to `false` to disable request/block logs on the in-process default network used by tests |
| `GAS` | (auto) | Fixed gas limit; unset = estimate |
| `GAS_PRICE` | `0` | Gas price (zero fees by default) |
| `INITIAL_BASE_FEE_PER_GAS` | `0` | Base fee for simulated node (zero by default) |

## Run the node (Docker)

```shell
docker build -t hardhat-docker:latest .

# Single node, default port 8545
docker create --name evm_0 -p 8545:8545 hardhat-docker:latest
docker start evm_0
docker logs -f evm_0

# Custom chain ID
docker create --name evm_1 -e CHAIN_ID=31338 -p 8546:8545 hardhat-docker:latest
docker start evm_1

# Interval mining (block every 5s) — requires AUTO_MINE=false
docker create --name evm_2 -e CHAIN_ID=31339 -e AUTO_MINE=false -e MINE_INTERVAL=5000 -p 8549:8545 hardhat-docker:latest
docker start evm_2

# Stop and remove containers
docker stop evm_0 evm_1 evm_2
docker rm evm_0 evm_1 evm_2
```

## Run the node (Docker Compose)

```shell
# Single node
docker compose -p hardhat-node up -d
docker compose -p hardhat-node down

# Node plus explorer
docker compose -p hardhat-node up -d node explorer

# Interval mining
AUTO_MINE=false MINE_INTERVAL=1000 docker compose -p hardhat-node up -d

# Multiple nodes
docker compose -p multiple -f docker-compose-test.yaml build
docker compose -p multiple -f docker-compose-test.yaml up
docker compose -p multiple -f docker-compose-test.yaml down
```

With the explorer service enabled, the node is exposed on `http://127.0.0.1:8545` and the explorer is exposed on `http://127.0.0.1:8787`.

## Deploy against the Docker node (Ignition)

Start the node (for example `docker compose -f docker-compose-local.yaml up -d`), then from the project root:

```shell
npx hardhat ignition deploy --network localnode ignition/modules/Counter.ts
```

`localnode` points at `http://localhost:8545` and uses the same `CHAIN_ID` and fee settings (zero by default).

Deploy the same module to the in-process default chain:

```shell
npx hardhat ignition deploy ignition/modules/Counter.ts
```

## Sample ERC-20 and NFT data for the block explorer

The Hardhat node uses the standard deterministic mnemonic with 20 funded accounts:

```text
test test test test test test test test test test test junk
```

To deploy only the sample ERC-20 and ERC-721 contracts with Ignition:

```shell
npm run deploy:sample-assets:local
```

To create explorer-friendly sample activity, start the node and run:

```shell
npm run seed:sample-assets:local
```

The seed script deploys `SampleToken` and `SampleNFT`, then creates ERC-20 transfers, NFT mints, and NFT transfers against `http://localhost:8545`.

## Block explorer

The current explorer is `block-explorer`, a Vite + React + TypeScript app with a small local SQLite-backed API server for token and NFT indexing.

Start the node from the repository root:

```shell
npx hardhat node
```

For normal local usage, build the explorer UI and run the backend server:

```shell
cd block-explorer
npm install
npm run serve
```

Open `http://127.0.0.1:8787/`. The backend serves both the React UI and `/api/*`.

If `npm run serve` fails with a `better-sqlite3` `NODE_MODULE_VERSION` mismatch after changing Node.js versions, rebuild the native dependency:

```shell
npm rebuild better-sqlite3
```

For active frontend development, run the API server and Vite separately:

```shell
cd block-explorer
npm run dev:server
```

In another terminal:

```shell
cd block-explorer
npm run dev
```

Open `http://127.0.0.1:5173/`. Vite proxies `/api` requests to `http://127.0.0.1:8787/`. By default the browser reads `http://127.0.0.1:8545` for core chain views, while token and NFT views read from the API server. You can override that with:

```env
VITE_RPC_URL=http://127.0.0.1:8545
VITE_SCAN_DEPTH=1000
VITE_EXPLORER_API_URL=http://127.0.0.1:8787
EXPLORER_API_PORT=8787
EXPLORER_API_HOST=127.0.0.1
EXPLORER_DB_PATH=.data/explorer.sqlite
EXPLORER_ARTIFACTS_PATH=../artifacts
EXPLORER_IGNITION_DEPLOYMENTS_PATH=../ignition/deployments
EXPLORER_ADDRESS_LABELS_PATH=../address-labels.env
EXPLORER_STATIC_PATH=dist
EXPLORER_SERVE_STATIC=true
```

The explorer includes dashboard, blocks, transactions, address details, plugin-backed token transfers, plugin-backed NFT transfers, token activity, NFT activity, artifact-backed decoded transaction input data, and artifact-backed contract read/write views with optional browser ABI fallback. Token and NFT plugins are registered under `block-explorer/server/plugins`.

The API server reads Hardhat artifacts and Ignition deployment maps directly from the root project by default, so there is no artifact copy step in the normal repo layout. Override `EXPLORER_ARTIFACTS_PATH` or `EXPLORER_IGNITION_DEPLOYMENTS_PATH` only when running the explorer from a different directory structure.

In Docker Compose, the explorer runs as a separate image built from `block-explorer/Dockerfile`. It talks to the node at `http://node:8545`, stores its SQLite index in the `explorer-data` volume, and reads compiled artifacts from `/workspace/artifacts` inside the explorer image. The explorer image runs `npx hardhat compile` during build, so artifact-backed ABI decoding works without mounting the local `artifacts` directory. For project-specific address labels in Docker, mount a labels file and point `EXPLORER_ADDRESS_LABELS_PATH` at it; otherwise the image uses `address-labels.example.env`.

Optional ENS-like address labels can be loaded from `address-labels.env`. Start from the checked-in example:

```shell
cp address-labels.example.env address-labels.env
```

Each line is `address=label`, such as:

```env
0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266=Hardhat Deployer
0x70997970c51812dc3a010c7d01b50e0d17dc79c8=Alice
```

The explorer shows those labels beside matching addresses in transaction tables, token transfers, block miner details, and address pages.

### Sepolia

Set `SEPOLIA_RPC_URL` and `SEPOLIA_PRIVATE_KEY` (for example with `npx hardhat keystore set SEPOLIA_PRIVATE_KEY`), then:

```shell
npx hardhat ignition deploy --network sepolia ignition/modules/Counter.ts
```

## Run tests

```shell
npm test
# or
npx hardhat test
```

Run only Solidity (Foundry-style) or only Mocha tests:

```shell
npx hardhat test solidity
npx hardhat test mocha
```

Tests use the in-process `default` simulated network (no Docker node required).

## Other scripts

```shell
npm run send-op-tx
```

Runs `scripts/send-op-tx.ts` against the `hardhatOp` network (OP stack chain type).

## Networks

| Network | Type | Use |
|---------|------|-----|
| `default` | Simulated (in-process) | Default for `network.create()` in Mocha tests |
| `node` | Simulated | **`hardhat node` uses this network by default** (same mining / chain / fee env as Docker) |
| `localnode` | HTTP `localhost:8545` | Ignition and scripts against the node running in Docker |
| `hardhatMainnet` | Simulated L1 | Extra L1 simulated network |
| `hardhatOp` | Simulated OP | Example OP chain type (see `scripts/send-op-tx.ts`) |
| `sepolia` | HTTP | Testnet deployments (config variables) |
