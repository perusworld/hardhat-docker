import { ethers } from 'ethers'
import { explorerApiUrl } from './api'

export type AddressLabel = {
  address: string
  label: string
}

type AddressLabelsResponse = {
  labels: AddressLabel[]
  path: string
}

export async function getAddressLabels() {
  const response = await fetch(new URL('/api/address-labels', explorerApiUrl))
  if (!response.ok) {
    throw new Error(`Address labels request failed: ${response.status} ${response.statusText}`)
  }

  return response.json() as Promise<AddressLabelsResponse>
}

export function labelForAddress(labels: AddressLabel[] | undefined, address?: string | null) {
  if (!address || !ethers.isAddress(address)) return undefined
  const normalizedAddress = ethers.getAddress(address).toLowerCase()
  return labels?.find((entry) => entry.address.toLowerCase() === normalizedAddress)?.label
}
