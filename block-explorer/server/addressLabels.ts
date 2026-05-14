import { existsSync } from 'node:fs'
import { readFile, stat } from 'node:fs/promises'
import { ethers } from 'ethers'
import { addressLabelsPath } from './config.ts'

export type AddressLabel = {
  address: string
  label: string
}

let cachedMtimeMs: number | undefined
let cachedLabels: AddressLabel[] = []

function unquote(value: string) {
  const trimmed = value.trim()
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1).trim()
  }

  return trimmed
}

function parseAddressLabels(raw: string) {
  const labels = new Map<string, AddressLabel>()

  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    const separatorIndex = trimmed.indexOf('=')
    if (separatorIndex < 0) continue

    const addressValue = unquote(trimmed.slice(0, separatorIndex))
    const label = unquote(trimmed.slice(separatorIndex + 1))
    if (!label || !ethers.isAddress(addressValue)) continue

    const address = ethers.getAddress(addressValue)
    labels.set(address.toLowerCase(), { address, label })
  }

  return [...labels.values()].sort((left, right) => left.label.localeCompare(right.label))
}

export async function getAddressLabels() {
  if (!existsSync(addressLabelsPath)) return []

  const fileStat = await stat(addressLabelsPath)
  if (fileStat.mtimeMs === cachedMtimeMs) return cachedLabels

  cachedMtimeMs = fileStat.mtimeMs
  cachedLabels = parseAddressLabels(await readFile(addressLabelsPath, 'utf8'))
  return cachedLabels
}

export async function getAddressLabel(address: string) {
  if (!ethers.isAddress(address)) return undefined

  const normalizedAddress = ethers.getAddress(address).toLowerCase()
  return (await getAddressLabels()).find((entry) => entry.address.toLowerCase() === normalizedAddress)
}

export function addressLabelsSource() {
  return addressLabelsPath
}
