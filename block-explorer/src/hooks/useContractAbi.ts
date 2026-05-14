import { useQuery } from '@tanstack/react-query'
import { useStoredAbi } from './useStoredAbi'
import { getContractMetadata } from '../lib/contractMetadata'

export function useContractAbi(address?: string | null) {
  const storedAbi = useStoredAbi(address ?? undefined)
  const contractMetadata = useQuery({
    queryKey: ['contract-metadata', address],
    queryFn: () => getContractMetadata(address ?? ''),
    enabled: Boolean(address),
    staleTime: 30_000,
    retry: false,
  })

  const backendAbi = contractMetadata.data?.abi ?? undefined
  const storedBrowserAbi = storedAbi.data?.abi

  return {
    abi: backendAbi ?? storedBrowserAbi,
    contractMetadata,
    isLoading: contractMetadata.isLoading || (!backendAbi && storedAbi.isLoading),
    source: backendAbi ? contractMetadata.data?.matchSource : storedBrowserAbi ? 'browser' : undefined,
    storedAbi,
  }
}
