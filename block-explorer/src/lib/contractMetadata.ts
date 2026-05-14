import { explorerApiUrl } from './api'

export type ContractMetadata = {
  abi: string | null
  address: string
  artifactId: string | null
  contractName: string | null
  matchSource: string | null
  sourceName: string | null
}

export async function getContractMetadata(address: string): Promise<ContractMetadata> {
  const response = await fetch(new URL(`/api/contracts/${address}/metadata`, explorerApiUrl))
  if (!response.ok) {
    throw new Error(`Contract metadata request failed: ${response.status} ${response.statusText}`)
  }

  return response.json() as Promise<ContractMetadata>
}
