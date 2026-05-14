import { existsSync } from 'node:fs'
import { readdir, readFile } from 'node:fs/promises'
import { join, relative } from 'node:path'
import { ethers } from 'ethers'
import { artifactsPath, ignitionDeploymentsPath } from './config.ts'
import { db, getContractMetadata } from './db.ts'

type HardhatArtifact = {
  abi?: unknown
  bytecode?: string
  contractName?: string
  deployedBytecode?: string
  sourceName?: string
}

type ArtifactRecord = {
  abi: string
  bytecode: string | null
  contractName: string
  deployedBytecode: string | null
  id: string
  sourceName: string
}

const upsertArtifact = db.prepare(`
  INSERT INTO contract_artifacts (
    id,
    contract_name,
    source_name,
    abi,
    bytecode,
    deployed_bytecode,
    updated_at
  )
  VALUES (?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(id) DO UPDATE SET
    contract_name = excluded.contract_name,
    source_name = excluded.source_name,
    abi = excluded.abi,
    bytecode = excluded.bytecode,
    deployed_bytecode = excluded.deployed_bytecode,
    updated_at = excluded.updated_at
`)

const getArtifactById = db.prepare(`
  SELECT
    id,
    contract_name AS contractName,
    source_name AS sourceName,
    abi,
    bytecode,
    deployed_bytecode AS deployedBytecode
  FROM contract_artifacts
  WHERE id = ?
`)

const getArtifactsByContractName = db.prepare(`
  SELECT
    id,
    contract_name AS contractName,
    source_name AS sourceName,
    abi,
    bytecode,
    deployed_bytecode AS deployedBytecode
  FROM contract_artifacts
  WHERE contract_name = ?
`)

const getArtifactsWithRuntimeBytecode = db.prepare(`
  SELECT
    id,
    contract_name AS contractName,
    source_name AS sourceName,
    abi,
    bytecode,
    deployed_bytecode AS deployedBytecode
  FROM contract_artifacts
  WHERE deployed_bytecode IS NOT NULL
    AND deployed_bytecode != '0x'
`)

const upsertContractAddress = db.prepare(`
  INSERT INTO contract_addresses (
    address,
    chain_id,
    artifact_id,
    contract_name,
    source_name,
    abi,
    match_source,
    updated_at
  )
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(address) DO UPDATE SET
    chain_id = excluded.chain_id,
    artifact_id = excluded.artifact_id,
    contract_name = excluded.contract_name,
    source_name = excluded.source_name,
    abi = excluded.abi,
    match_source = excluded.match_source,
    updated_at = excluded.updated_at
`)

function normalizeBytecode(value?: string) {
  if (!value || value === '0x') return null
  return value.toLowerCase()
}

async function walkJsonFiles(directory: string): Promise<string[]> {
  if (!existsSync(directory)) return []

  const entries = await readdir(directory, { withFileTypes: true })
  const files = await Promise.all(
    entries.map(async (entry) => {
      const path = join(directory, entry.name)
      if (entry.isDirectory()) return walkJsonFiles(path)
      if (!entry.isFile() || !entry.name.endsWith('.json')) return []
      if (path.includes('/build-info/')) return []
      return [path]
    }),
  )

  return files.flat()
}

function artifactId(sourceName: string, contractName: string) {
  return `${sourceName}:${contractName}`
}

async function readArtifact(path: string): Promise<ArtifactRecord | null> {
  const raw = JSON.parse(await readFile(path, 'utf8')) as HardhatArtifact
  if (!Array.isArray(raw.abi) || !raw.contractName || !raw.sourceName) return null

  return {
    abi: JSON.stringify(raw.abi),
    bytecode: normalizeBytecode(raw.bytecode),
    contractName: raw.contractName,
    deployedBytecode: normalizeBytecode(raw.deployedBytecode),
    id: artifactId(raw.sourceName, raw.contractName),
    sourceName: raw.sourceName,
  }
}

export async function scanArtifacts() {
  const now = Math.floor(Date.now() / 1000)
  const files = await walkJsonFiles(artifactsPath)
  const records = (await Promise.all(files.map(readArtifact))).filter((record): record is ArtifactRecord => Boolean(record))

  const write = db.transaction((artifacts: ArtifactRecord[]) => {
    for (const artifact of artifacts) {
      upsertArtifact.run(
        artifact.id,
        artifact.contractName,
        artifact.sourceName,
        artifact.abi,
        artifact.bytecode,
        artifact.deployedBytecode,
        now,
      )
    }
  })

  write(records)

  return records.map((record) => ({
    contractName: record.contractName,
    id: record.id,
    sourceName: record.sourceName,
  }))
}

function findArtifactForDeploymentKey(deploymentKey: string) {
  const contractName = deploymentKey.includes('#') ? deploymentKey.split('#').at(-1) : deploymentKey
  if (!contractName) return undefined

  const exactId = getArtifactById.get(deploymentKey) as ArtifactRecord | undefined
  if (exactId) return exactId

  const matches = getArtifactsByContractName.all(contractName) as ArtifactRecord[]
  if (matches.length === 1) return matches[0]

  return matches.find((artifact) => deploymentKey.includes(artifact.sourceName) || deploymentKey.includes(artifact.contractName))
}

export async function scanIgnitionDeployments(chainId: string) {
  await scanArtifacts()

  const deploymentFile = join(ignitionDeploymentsPath, `chain-${chainId}`, 'deployed_addresses.json')
  if (!existsSync(deploymentFile)) return []

  const deployed = JSON.parse(await readFile(deploymentFile, 'utf8')) as Record<string, string>
  const now = Math.floor(Date.now() / 1000)
  const matches = []

  for (const [deploymentKey, address] of Object.entries(deployed)) {
    if (!ethers.isAddress(address)) continue

    const artifact = findArtifactForDeploymentKey(deploymentKey)
    if (!artifact) continue

    upsertContractAddress.run(
      ethers.getAddress(address).toLowerCase(),
      chainId,
      artifact.id,
      artifact.contractName,
      artifact.sourceName,
      artifact.abi,
      'ignition',
      now,
    )

    matches.push({ address, artifactId: artifact.id, deploymentKey })
  }

  return matches
}

function findArtifactByRuntimeBytecode(runtimeBytecode: string) {
  const normalizedRuntime = runtimeBytecode.toLowerCase()
  const artifacts = getArtifactsWithRuntimeBytecode.all() as ArtifactRecord[]
  return artifacts
    .filter((artifact) => artifact.deployedBytecode && normalizedRuntime === artifact.deployedBytecode)
    .sort((left, right) => (right.deployedBytecode?.length ?? 0) - (left.deployedBytecode?.length ?? 0))[0]
}

export async function resolveContractMetadata(options: {
  address: string
  chainId: string
  provider: ethers.JsonRpcProvider
}) {
  const normalizedAddress = ethers.getAddress(options.address).toLowerCase()
  const existing = getContractMetadata(normalizedAddress)
  if (existing) return existing

  await scanIgnitionDeployments(options.chainId)

  const fromDeployment = getContractMetadata(normalizedAddress)
  if (fromDeployment) return fromDeployment

  const runtimeCode = await options.provider.getCode(normalizedAddress)
  const artifact = findArtifactByRuntimeBytecode(runtimeCode)
  if (!artifact) return undefined

  upsertContractAddress.run(
    normalizedAddress,
    options.chainId,
    artifact.id,
    artifact.contractName,
    artifact.sourceName,
    artifact.abi,
    'bytecode',
    Math.floor(Date.now() / 1000),
  )

  return getContractMetadata(normalizedAddress)
}

export function artifactRoots() {
  return {
    artifactsPath,
    ignitionDeploymentsPath,
    relativeArtifactsPath: relative(process.cwd(), artifactsPath),
    relativeIgnitionDeploymentsPath: relative(process.cwd(), ignitionDeploymentsPath),
  }
}
