import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

export const rpcUrl = process.env.RPC_URL ?? process.env.VITE_RPC_URL ?? 'http://127.0.0.1:8545'
export const serverPort = Number(process.env.EXPLORER_API_PORT ?? 8787)
export const databasePath = resolve(process.env.EXPLORER_DB_PATH ?? '.data/explorer.sqlite')
export const pollIntervalMs = Number(process.env.EXPLORER_POLL_INTERVAL_MS ?? 2_000)
export const indexStartBlock = Number(process.env.EXPLORER_INDEX_START_BLOCK ?? 0)
export const artifactsPath = resolve(process.env.EXPLORER_ARTIFACTS_PATH ?? '../artifacts')
export const ignitionDeploymentsPath = resolve(process.env.EXPLORER_IGNITION_DEPLOYMENTS_PATH ?? '../ignition/deployments')
export const addressLabelsPath = resolve(process.env.EXPLORER_ADDRESS_LABELS_PATH ?? '../address-labels.env')
export const serveStatic = process.env.EXPLORER_SERVE_STATIC !== 'false'
export const staticAssetsPath = resolve(process.env.EXPLORER_STATIC_PATH ?? 'dist')

mkdirSync(dirname(databasePath), { recursive: true })
