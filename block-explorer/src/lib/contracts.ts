import { ethers } from 'ethers'
import { provider } from './explorer'

export type ContractFunction = ethers.FunctionFragment & {
  signature: string
}

export function parseAbi(abi: string) {
  const parsed = JSON.parse(abi)
  const fragments = Array.isArray(parsed) ? parsed : parsed.abi
  return new ethers.Interface(fragments)
}

export function getContractFunctions(abi: string) {
  const contractInterface = parseAbi(abi)
  const functions = contractInterface.fragments
    .filter((fragment): fragment is ethers.FunctionFragment => fragment.type === 'function')
    .map((fragment) => Object.assign(fragment, { signature: fragment.format('sighash') }))

  const readFunctions = functions.filter((fragment) => fragment.constant || fragment.stateMutability === 'view' || fragment.stateMutability === 'pure')
  const writeFunctions = functions.filter((fragment) => !readFunctions.includes(fragment))

  return { contractInterface, readFunctions, writeFunctions }
}

export function getReadContract(address: string, abi: string) {
  return new ethers.Contract(address, JSON.parse(abi), provider)
}

export async function getWriteContract(address: string, abi: string) {
  if (!window.ethereum) {
    throw new Error('No injected wallet was found.')
  }

  await window.ethereum.request({ method: 'eth_requestAccounts' })
  const browserProvider = new ethers.BrowserProvider(window.ethereum)
  const signer = await browserProvider.getSigner()
  return new ethers.Contract(address, JSON.parse(abi), signer)
}

export function coerceContractInput(value: string, input: ethers.ParamType) {
  if (input.baseType === 'array' || input.baseType === 'tuple') {
    return JSON.parse(value)
  }

  if (input.type === 'bool') {
    return value === 'true' || value === '1'
  }

  if (input.type.startsWith('uint') || input.type.startsWith('int')) {
    return value.trim()
  }

  if (input.type === 'bytes' || /^bytes\d+$/.test(input.type)) {
    return value.trim()
  }

  return value
}

export function stringifyContractResult(value: unknown): string {
  if (typeof value === 'bigint') return value.toString()
  if (value instanceof Uint8Array) return ethers.hexlify(value)
  if (Array.isArray(value)) return JSON.stringify(value.map((item) => stringifyContractResult(item)), null, 2)
  if (value && typeof value === 'object') {
    return JSON.stringify(
      value,
      (_key, item) => {
        if (typeof item === 'bigint') return item.toString()
        return item
      },
      2,
    )
  }
  return String(value)
}

declare global {
  interface Window {
    ethereum?: ethers.Eip1193Provider
  }
}
