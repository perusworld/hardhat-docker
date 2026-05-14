import { ethers } from 'ethers'
import type { ExplorerPlugin } from './types.ts'

export const erc20TransferTopic = ethers.id('Transfer(address,address,uint256)')

function topicToAddress(topic: string) {
  return ethers.getAddress(`0x${topic.slice(26)}`)
}

export const erc20Plugin: ExplorerPlugin = {
  id: 'erc20',
  name: 'ERC-20 Tokens',
  eventTopics: [erc20TransferTopic],
  decodeLog(log) {
    if (log.topics[0] !== erc20TransferTopic || log.topics.length !== 3) return []

    return [
      {
        amount: BigInt(log.data),
        from: topicToAddress(log.topics[1]),
        id: `${log.transactionHash}-${log.index ?? 0}-0`,
        kind: 'ERC-20',
        logIndex: log.index ?? 0,
        to: topicToAddress(log.topics[2]),
        tokenAddress: ethers.getAddress(log.address),
        transactionHash: log.transactionHash,
      },
    ]
  },
}
