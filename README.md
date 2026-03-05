# Hardhat Docker

Run a Hardhat node in Docker. Default: zero fees, auto mining, chain ID 31337.

## Environment variables (node in Docker)

| Variable | Default | Description |
|----------|---------|-------------|
| `CHAIN_ID` | `31337` | Chain ID of the node |
| `AUTO_MINE` | `true` | Set to `false` to disable automine |
| `MINE_INTERVAL` | `0` | If > 0 and automine off, mine a block every N ms |
| `HARDHAT_NODE_LOGGING` | `true` | Set to `false` to disable request/block logs |
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

## Deploy / run scripts against the node

Start the node (e.g. `docker compose up -d`), then from the project root:

```shell
npx hardhat run scripts/deploy.ts --network localnode
```

`localnode` points at `http://localhost:8545` and uses the same `CHAIN_ID` and fee settings (zero by default).

## Run tests

```shell
npm test
# or
npx hardhat test
```

Uses the in-process `hardhat` network (no Docker node required).

## Networks

| Network | Type | Use |
|---------|------|-----|
| `hardhat` | Simulated (in-process) | Default for tests, compile, console |
| `node` | Simulated (same config as container) | When you need the same config as the Docker node |
| `localnode` | HTTP `localhost:8545` | Deploy/scripts against the node running in Docker |
