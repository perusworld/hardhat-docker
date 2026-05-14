import { ethers } from 'ethers'
import type { ExplorerPlugin, IndexedTokenTransfer } from './types.ts'

export const erc721TransferTopic = ethers.id('Transfer(address,address,uint256)')
export const erc1155TransferSingleTopic = ethers.id('TransferSingle(address,address,address,uint256,uint256)')
export const erc1155TransferBatchTopic = ethers.id('TransferBatch(address,address,address,uint256[],uint256[])')

function topicToAddress(topic: string) {
  return ethers.getAddress(`0x${topic.slice(26)}`)
}

export const nftPlugin: ExplorerPlugin = {
  id: 'nfts',
  name: 'NFTs',
  eventTopics: [erc721TransferTopic, erc1155TransferSingleTopic, erc1155TransferBatchTopic],
  decodeLog(log) {
    if (log.topics[0] === erc721TransferTopic && log.topics.length === 4) {
      return [
        {
          from: topicToAddress(log.topics[1]),
          id: `${log.transactionHash}-${log.index ?? 0}-0`,
          kind: 'ERC-721',
          logIndex: log.index ?? 0,
          to: topicToAddress(log.topics[2]),
          tokenAddress: ethers.getAddress(log.address),
          tokenId: BigInt(log.topics[3]).toString(),
          transactionHash: log.transactionHash,
        },
      ]
    }

    if (log.topics[0] === erc1155TransferSingleTopic) {
      const [tokenId, amount] = ethers.AbiCoder.defaultAbiCoder().decode(['uint256', 'uint256'], log.data)

      return [
        {
          amount,
          from: topicToAddress(log.topics[2]),
          id: `${log.transactionHash}-${log.index ?? 0}-0`,
          kind: 'ERC-1155',
          logIndex: log.index ?? 0,
          to: topicToAddress(log.topics[3]),
          tokenAddress: ethers.getAddress(log.address),
          tokenId: tokenId.toString(),
          transactionHash: log.transactionHash,
        },
      ]
    }

    if (log.topics[0] === erc1155TransferBatchTopic) {
      const [tokenIds, amounts] = ethers.AbiCoder.defaultAbiCoder().decode(['uint256[]', 'uint256[]'], log.data)

      return tokenIds.map((tokenId: bigint, index: number): IndexedTokenTransfer => ({
        amount: amounts[index],
        from: topicToAddress(log.topics[2]),
        id: `${log.transactionHash}-${log.index ?? 0}-${index}`,
        kind: 'ERC-1155',
        logIndex: log.index ?? 0,
        to: topicToAddress(log.topics[3]),
        tokenAddress: ethers.getAddress(log.address),
        tokenId: tokenId.toString(),
        transactionHash: log.transactionHash,
      }))
    }

    return []
  },
}
