# Hardhat Docker

```shell
docker build -t hardhat-docker:latest .

docker create --name evm_1 -e CHAIN_ID=31338 -p 8546:8545 hardhat-docker:latest
docker create --name evm_1 -e CHAIN_ID=31339 -e MINE_INTERVAL=5000 -p 8549:8545 hardhat-docker:latest

docker start evm_1
docker logs -f evm_1
docker stop evm_1
docker rm evm_1

# Build first
with docker compose single
docker compose -p hardhat-node up -d
AUTO_MINE=false MINE_INTERVAL=1000 docker compose -p hardhat-node up -d
docker compose -p hardhat-node down


# with docker compose multiple
docker compose -p multiple -f docker-compose-test.yaml build
docker compose -p multiple -f docker-compose-test.yaml up
docker compose -p multiple -f docker-compose-test.yaml down

```
