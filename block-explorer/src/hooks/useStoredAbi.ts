import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { deleteStoredAbi, getStoredAbi, saveStoredAbi } from '../lib/abiStore'

export function useStoredAbi(address?: string) {
  return useQuery({
    queryKey: ['stored-abi', address],
    queryFn: () => getStoredAbi(address ?? ''),
    enabled: Boolean(address),
    staleTime: Number.POSITIVE_INFINITY,
  })
}

export function useSaveStoredAbi(address?: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (abi: string) => saveStoredAbi(address ?? '', abi),
    onSuccess: (storedAbi) => {
      queryClient.setQueryData(['stored-abi', storedAbi.address], storedAbi)
      void queryClient.invalidateQueries({ queryKey: ['stored-abi', address] })
    },
  })
}

export function useDeleteStoredAbi(address?: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => deleteStoredAbi(address ?? ''),
    onSuccess: () => {
      queryClient.setQueryData(['stored-abi', address], undefined)
      void queryClient.invalidateQueries({ queryKey: ['stored-abi', address] })
    },
  })
}
