import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { ethers } from 'ethers'

dayjs.extend(relativeTime)

const zeroAddressPattern = /^0x0{40}$/i

export function compactHash(value?: string | null, head = 6, tail = 4) {
  if (!value) return 'Contract creation'
  if (value.length <= head + tail + 3) return value
  return `${value.slice(0, head)}...${value.slice(-tail)}`
}

export function formatEth(value?: bigint | null, maximumFractionDigits = 6) {
  if (value == null) return '0'
  const asNumber = Number(ethers.formatEther(value))
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits,
  }).format(asNumber)
}

export function formatGwei(value?: bigint | null, maximumFractionDigits = 3) {
  if (value == null) return '0'
  const asNumber = Number(ethers.formatUnits(value, 'gwei'))
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits,
  }).format(asNumber)
}

export function formatInteger(value?: bigint | number | null) {
  if (value == null) return '0'
  return new Intl.NumberFormat('en-US').format(Number(value))
}

export function formatTimestamp(timestamp?: number | null) {
  if (!timestamp) return 'Pending'
  return dayjs.unix(timestamp).format('MMM D, YYYY, h:mm:ss A')
}

export function formatAge(timestamp?: number | null) {
  if (!timestamp) return 'Pending'

  const blockTime = dayjs.unix(timestamp)
  const now = dayjs()

  if (blockTime.isAfter(now)) {
    return 'just now'
  }

  return blockTime.fromNow()
}

export function isEmptyAddress(value?: string | null) {
  return !value || zeroAddressPattern.test(value)
}

export function percentage(used?: bigint | null, limit?: bigint | null) {
  if (!used || !limit || limit === 0n) return '0.00'
  return ((Number(used) / Number(limit)) * 100).toFixed(2)
}
