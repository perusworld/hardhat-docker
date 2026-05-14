import { useQuery } from '@tanstack/react-query'
import { getAddressLabels, labelForAddress } from '../lib/addressLabels'

export function useAddressLabels(enabled = true) {
  return useQuery({
    queryKey: ['address-labels'],
    queryFn: getAddressLabels,
    enabled,
    staleTime: 30_000,
    retry: false,
  })
}

export function useAddressLabel(address?: string | null) {
  const labels = useAddressLabels(Boolean(address))

  return {
    ...labels,
    label: labelForAddress(labels.data?.labels, address),
  }
}
