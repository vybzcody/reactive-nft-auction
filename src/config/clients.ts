import { createPublicClient, createWalletClient, custom, http } from 'viem'
import { somniaTestnet } from './chains'

declare global {
  interface Window {
    ethereum?: any
  }
}

export const publicClient = createPublicClient({
  chain: somniaTestnet,
  transport: http(),
})

export const getWalletClient = () => {
  if (typeof window !== 'undefined' && window.ethereum) {
    return createWalletClient({
      chain: somniaTestnet,
      transport: custom(window.ethereum),
    })
  }
  return null
}

// Get current gas price from the network
export const getGasPrice = async () => {
  try {
    const gasPrice = await publicClient.getGasPrice()
    // Add 10% buffer to avoid being underpriced
    return (gasPrice * 110n) / 100n
  } catch (error) {
    console.error('Failed to get gas price:', error)
    // Fallback to 1 gwei if estimation fails
    return 1_000_000_000n
  }
}

// Estimate gas for a transaction
export const estimateGas = async (params: {
  address: `0x${string}`
  abi: any
  functionName: string
  args?: readonly any[]
  account: `0x${string}`
  value?: bigint
}) => {
  try {
    const estimated = await publicClient.estimateContractGas({
      address: params.address,
      abi: params.abi,
      functionName: params.functionName,
      args: params.args,
      account: params.account,
      value: params.value,
    })
    // Add 20% buffer to avoid out-of-gas errors
    return (estimated * 120n) / 100n
  } catch (error) {
    console.warn('Gas estimation failed:', error)
    // Return undefined to let wallet handle estimation
    return undefined
  }
}
