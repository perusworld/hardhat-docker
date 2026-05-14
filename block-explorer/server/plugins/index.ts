import { erc20Plugin } from './erc20.ts'
import { nftPlugin } from './nfts.ts'

export const plugins = [erc20Plugin, nftPlugin]

export function topicsForRegisteredPlugins() {
  return [...new Set(plugins.flatMap((plugin) => plugin.eventTopics))]
}
