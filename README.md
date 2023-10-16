# Hardhat Docker

```shell

docker build -t hardhat-docker:latest .

docker create --name evm_1 -e CHAIN_ID=31338 -p 8546:8545 hardhat-docker:latest

docker start evm_1
docker stop evm_1
docker logs -f evm_1

```
