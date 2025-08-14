# Hardhat Docker

```shell
docker build -t hardhat-docker:latest .

docker create --name evm_1 -e CHAIN_ID=31338 -p 8546:8545 hardhat-docker:latest
docker create --name evm_1 -e CHAIN_ID=31339 -e MINE_INTERVAL=5000 -p 8549:8545 hardhat-docker:latest

docker start evm_1
docker logs -f evm_1
docker stop evm_1
docker rm evm_1

#with docker compose
docker compose -p multiple -f docker-compose-test.yaml build
docker compose -p multiple -f docker-compose-test.yaml up
docker compose -p multiple -f docker-compose-test.yaml down


# Build first
docker compose build

# Run with custom names
docker compose -p hardhat-node up -d

# Stop
docker compose -p hardhat-node down



docker compose -f docker-compose-local.yaml build
AUTO_MINE=false MINE_INTERVAL=1000 docker compose -f docker-compose-local.yaml -p hardhat-node-local up
docker compose -f docker-compose-local.yaml -p hardhat-node-local down -v

```
