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

# Interval mining
AUTO_MINE=false MINE_INTERVAL=1000 docker compose -p hardhat-node up -d

# Multiple nodes
docker compose -p multiple -f docker-compose-test.yaml build
docker compose -p multiple -f docker-compose-test.yaml up
docker compose -p multiple -f docker-compose-test.yaml down
```

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

The current explorer UI is `block-explorer`, a Vite + React + TypeScript app for local Hardhat nodes. It replaces the older Create React App explorer.

Start the node from the repository root:

```shell
npx hardhat node
```

Then run the explorer:

```shell
cd block-explorer
npm install
npm run dev
```

Open `http://127.0.0.1:5173/`. By default the explorer reads `http://127.0.0.1:8545` and scans the latest 1000 blocks. You can override that with:

```env
VITE_RPC_URL=http://127.0.0.1:8545
VITE_SCAN_DEPTH=1000
```

The explorer includes dashboard, blocks, transactions, address details, decoded token transfers, decoded NFT transfers, token activity, NFT activity, and local ABI-backed contract read/write views.

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
