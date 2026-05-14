import { ethers } from 'ethers'

export type StoredAbi = {
  abi: string
  address: string
  updatedAt: number
}

const databaseName = 'hardhat-scan'
const storeName = 'contract-abis'
const version = 1

function openDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(databaseName, version)

    request.onupgradeneeded = () => {
      const database = request.result
      if (!database.objectStoreNames.contains(storeName)) {
        database.createObjectStore(storeName, { keyPath: 'address' })
      }
    }

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
  })
}

function withStore<T>(mode: IDBTransactionMode, callback: (store: IDBObjectStore) => IDBRequest<T>) {
  return openDatabase().then(
    (database) =>
      new Promise<T>((resolve, reject) => {
        const transaction = database.transaction(storeName, mode)
        const store = transaction.objectStore(storeName)
        const request = callback(store)

        request.onerror = () => reject(request.error)
        request.onsuccess = () => resolve(request.result)
        transaction.oncomplete = () => database.close()
        transaction.onerror = () => {
          database.close()
          reject(transaction.error)
        }
      }),
  )
}

export function normalizeAbiInput(input: string) {
  const parsed = JSON.parse(input)
  const abi = Array.isArray(parsed) ? parsed : parsed.abi

  if (!Array.isArray(abi)) {
    throw new Error('ABI must be a JSON array or an object with an abi array.')
  }

  // Constructing Interface validates fragments and normalizes common ABI issues.
  new ethers.Interface(abi)
  return JSON.stringify(abi, null, 2)
}

export async function getStoredAbi(address: string) {
  return withStore<StoredAbi | undefined>('readonly', (store) => store.get(ethers.getAddress(address)))
}

export async function saveStoredAbi(address: string, abi: string) {
  const normalizedAddress = ethers.getAddress(address)
  const normalizedAbi = normalizeAbiInput(abi)
  const storedAbi: StoredAbi = {
    abi: normalizedAbi,
    address: normalizedAddress,
    updatedAt: Date.now(),
  }

  await withStore<IDBValidKey>('readwrite', (store) => store.put(storedAbi))
  return storedAbi
}

export async function deleteStoredAbi(address: string) {
  await withStore<undefined>('readwrite', (store) => store.delete(ethers.getAddress(address)) as IDBRequest<undefined>)
}
