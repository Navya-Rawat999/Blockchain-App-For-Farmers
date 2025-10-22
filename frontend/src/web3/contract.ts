import type { Address } from 'viem'
import { readContract, writeContract, waitForTransactionReceipt } from 'wagmi/actions'
import { config } from './wagmiConfig'
import { PRODUCE_MARKET_ABI } from './abi'

export type ProduceDetails = {
  id: bigint
  name: string
  originalFarmer: Address
  currentSeller: Address
  currentStatus: string
  priceInWei: bigint
  originFarm: string
  qrCode: string
}

export async function getProduceDetails(contract: Address, id: bigint): Promise<ProduceDetails> {
  const res = await readContract(config, {
    address: contract,
    abi: PRODUCE_MARKET_ABI,
    functionName: 'getProduceDetails',
    args: [id],
  }) as unknown as readonly [bigint, string, Address, Address, string, bigint, string, string]
  return {
    id: res[0],
    name: res[1],
    originalFarmer: res[2],
    currentSeller: res[3],
    currentStatus: res[4],
    priceInWei: res[5],
    originFarm: res[6],
    qrCode: res[7],
  }
}

export async function registerProduce(contract: Address, name: string, originFarm: string, price: bigint, qrData: string) {
  const hash = await writeContract(config, {
    address: contract,
    abi: PRODUCE_MARKET_ABI,
    functionName: 'registerProduce',
    args: [name, originFarm, price, qrData],
  })
  return waitForTransactionReceipt(config, { hash })
}

export async function buyProduce(contract: Address, id: bigint, value: bigint) {
  const hash = await writeContract(config, {
    address: contract,
    abi: PRODUCE_MARKET_ABI,
    functionName: 'buyProduce',
    args: [id],
    value,
  })
  return waitForTransactionReceipt(config, { hash })
}

export async function updatePrice(contract: Address, id: bigint, newPrice: bigint) {
  const hash = await writeContract(config, {
    address: contract,
    abi: PRODUCE_MARKET_ABI,
    functionName: 'updateProducePrice',
    args: [id, newPrice],
  })
  return waitForTransactionReceipt(config, { hash })
}

export async function updateStatus(contract: Address, id: bigint, newStatus: string) {
  const hash = await writeContract(config, {
    address: contract,
    abi: PRODUCE_MARKET_ABI,
    functionName: 'updateProduceStatus',
    args: [id, newStatus],
  })
  return waitForTransactionReceipt(config, { hash })
}
