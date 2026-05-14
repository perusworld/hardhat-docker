import { createServer, type ServerResponse } from 'node:http'
import { existsSync } from 'node:fs'
import { readFile, stat } from 'node:fs/promises'
import { extname, resolve, sep } from 'node:path'
import { URL } from 'node:url'
import { ethers } from 'ethers'
import { addressLabelsSource, getAddressLabel, getAddressLabels } from './addressLabels.ts'
import { artifactRoots, resolveContractMetadata, scanArtifacts, scanIgnitionDeployments } from './artifacts.ts'
import { databasePath, rpcUrl, serveStatic, serverHost, serverPort, staticAssetsPath } from './config.ts'
import { getTokenSummaries, getTokenTransfers } from './db.ts'
import { getIndexerStatus, startIndexer, syncToLatest } from './indexer.ts'

type RouteHandler = (requestUrl: URL) => Promise<unknown>

const jsonHeaders = {
  'access-control-allow-headers': 'content-type',
  'access-control-allow-methods': 'GET, OPTIONS',
  'access-control-allow-origin': '*',
  'content-type': 'application/json; charset=utf-8',
}

const mimeTypes: Record<string, string> = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.webp': 'image/webp',
}

const provider = new ethers.JsonRpcProvider(rpcUrl)

function limitParam(requestUrl: URL, fallback = 100) {
  const value = Number(requestUrl.searchParams.get('limit') ?? fallback)
  return Number.isFinite(value) ? Math.max(1, Math.min(value, 500)) : fallback
}

function addressParam(requestUrl: URL) {
  return requestUrl.searchParams.get('address')?.toLowerCase()
}

function transactionHashParam(requestUrl: URL) {
  return requestUrl.searchParams.get('transactionHash')?.toLowerCase()
}

const routes: Record<string, RouteHandler> = {
  '/api/status': async () => ({
    ...(await getIndexerStatus()),
    addressLabels: {
      count: (await getAddressLabels()).length,
      path: addressLabelsSource(),
    },
    artifacts: artifactRoots(),
  }),
  '/api/address-labels': async () => ({
    labels: await getAddressLabels(),
    path: addressLabelsSource(),
  }),
  '/api/contracts/rescan-artifacts': async () => {
    const status = await getIndexerStatus()
    const [artifacts, deployments] = await Promise.all([
      scanArtifacts(),
      scanIgnitionDeployments(status.chainId),
    ])

    return {
      artifactCount: artifacts.length,
      deploymentMatchCount: deployments.length,
    }
  },
  '/api/plugins/erc20/tokens': async () => {
    await syncToLatest()
    return getTokenSummaries(['ERC-20'])
  },
  '/api/plugins/erc20/transfers': async (requestUrl) => {
    await syncToLatest()
    return getTokenTransfers({
      address: addressParam(requestUrl),
      kinds: ['ERC-20'],
      limit: limitParam(requestUrl),
      transactionHash: transactionHashParam(requestUrl),
    })
  },
  '/api/plugins/erc721/collections': async () => {
    await syncToLatest()
    return getTokenSummaries(['ERC-721', 'ERC-1155'])
  },
  '/api/plugins/erc721/transfers': async (requestUrl) => {
    await syncToLatest()
    return getTokenTransfers({
      address: addressParam(requestUrl),
      kinds: ['ERC-721', 'ERC-1155'],
      limit: limitParam(requestUrl),
      transactionHash: transactionHashParam(requestUrl),
    })
  },
  '/api/plugins/token-transfers': async (requestUrl) => {
    await syncToLatest()
    return getTokenTransfers({
      kinds: ['ERC-20', 'ERC-721', 'ERC-1155'],
      limit: limitParam(requestUrl),
      transactionHash: transactionHashParam(requestUrl),
    })
  },
}

async function dynamicRoute(pathname: string) {
  const addressLabelMatch = pathname.match(/^\/api\/address-labels\/(?<address>0x[a-fA-F0-9]{40})$/)
  if (addressLabelMatch?.groups?.address) {
    const address = addressLabelMatch.groups.address
    return async () => getAddressLabel(address) ?? { address: ethers.getAddress(address), label: null }
  }

  const contractMetadataMatch = pathname.match(/^\/api\/contracts\/(?<address>0x[a-fA-F0-9]{40})\/metadata$/)
  if (!contractMetadataMatch?.groups?.address) return undefined
  const address = contractMetadataMatch.groups.address

  return async () => {
    const status = await getIndexerStatus()
    const metadata = await resolveContractMetadata({
      address,
      chainId: status.chainId,
      provider,
    })

    if (!metadata) {
      return {
        address: ethers.getAddress(address),
        abi: null,
        artifactId: null,
        contractName: null,
        matchSource: null,
        sourceName: null,
      }
    }

    return {
      ...metadata,
      address: ethers.getAddress(metadata.address),
    }
  }
}

function staticFilePath(pathname: string) {
  let decodedPath: string

  try {
    decodedPath = decodeURIComponent(pathname)
  } catch {
    return undefined
  }

  const relativePath = decodedPath === '/' ? 'index.html' : decodedPath.replace(/^\/+/, '')
  const filePath = resolve(staticAssetsPath, relativePath)
  const root = staticAssetsPath.endsWith(sep) ? staticAssetsPath : `${staticAssetsPath}${sep}`

  return filePath.startsWith(root) ? filePath : undefined
}

async function existingFile(path: string) {
  const fileStat = await stat(path).catch(() => undefined)
  return fileStat?.isFile() ? path : undefined
}

async function serveStaticFile(pathname: string, response: ServerResponse) {
  if (!serveStatic || pathname.startsWith('/api')) return false
  if (!existsSync(staticAssetsPath)) return false

  const requestedPath = staticFilePath(pathname)
  if (!requestedPath) return false

  const filePath = (await existingFile(requestedPath)) ?? (pathname.includes('.') ? undefined : await existingFile(resolve(staticAssetsPath, 'index.html')))
  if (!filePath) return false

  const body = await readFile(filePath).catch(() => undefined)
  if (!body) return false

  response.writeHead(200, {
    'cache-control': filePath.endsWith('index.html') ? 'no-cache' : 'public, max-age=31536000, immutable',
    'content-type': mimeTypes[extname(filePath)] ?? 'application/octet-stream',
  })
  response.end(body)
  return true
}

startIndexer()
void scanArtifacts().catch((error: unknown) => {
  console.error('Artifact scan failed', error)
})

createServer(async (request, response) => {
  if (request.method === 'OPTIONS') {
    response.writeHead(204, jsonHeaders)
    response.end()
    return
  }

  if (!request.url || request.method !== 'GET') {
    response.writeHead(405, jsonHeaders)
    response.end(JSON.stringify({ error: 'Method not allowed' }))
    return
  }

  const requestUrl = new URL(request.url, `http://${request.headers.host ?? '127.0.0.1'}`)
  const route = routes[requestUrl.pathname] ?? (await dynamicRoute(requestUrl.pathname))

  if (!route) {
    if (await serveStaticFile(requestUrl.pathname, response)) return

    response.writeHead(404, jsonHeaders)
    response.end(JSON.stringify({ error: 'Not found' }))
    return
  }

  route(requestUrl)
    .then((body) => {
      response.writeHead(200, jsonHeaders)
      response.end(JSON.stringify(body))
    })
    .catch((error: unknown) => {
      response.writeHead(500, jsonHeaders)
      response.end(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }))
    })
}).listen(serverPort, serverHost, () => {
  console.log(`Explorer API listening on http://${serverHost}:${serverPort}`)
  if (serveStatic) console.log(`Explorer UI path: ${staticAssetsPath}`)
  console.log(`SQLite database: ${databasePath}`)
})
