import { ethers } from 'ethers'
import { parseAbi, stringifyContractResult } from './contracts'

export type DecodedInputParameter = {
  name: string
  type: string
  value: string
}

export type DecodedTransactionInput = {
  functionName: string
  methodId: string
  parameters: DecodedInputParameter[]
  signature: string
}

function parameterName(input: ethers.ParamType, index: number) {
  return input.name || `arg${index}`
}

export function decodeTransactionInput(abi: string, data: string, value: bigint): DecodedTransactionInput | null {
  if (data === '0x') return null

  const contractInterface = parseAbi(abi)
  const parsed = contractInterface.parseTransaction({ data, value })
  if (!parsed) return null

  return {
    functionName: parsed.name,
    methodId: data.slice(0, 10),
    parameters: parsed.fragment.inputs.map((input, index) => ({
      name: parameterName(input, index),
      type: input.format('full'),
      value: stringifyContractResult(parsed.args[index]),
    })),
    signature: parsed.signature,
  }
}
