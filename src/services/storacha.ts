/**
 * Storacha IPFS Service
 * 
 * Handles IPFS file upload and retrieval using Storacha (Web3.Storage)
 */

import { create } from '@storacha/client'
import * as Proof from '@storacha/client/proof'
import * as Signer from '@storacha/client/principal/ed25519'
import { StoreMemory } from '@storacha/client/stores/memory'

// Multiple IPFS gateways for redundancy
const IPFS_GATEWAYS = [
  (cid: string) => `https://${cid}.ipfs.storacha.link`,
  (cid: string) => `https://w3s.link/ipfs/${cid}`,
  (cid: string) => `https://ipfs.io/ipfs/${cid}`,
]

class StorachaService {
  private client: any = null
  private initialized = false

  async initialize() {
    if (this.initialized) return

    const key = import.meta.env.VITE_STORACHA_KEY
    const proof = import.meta.env.VITE_STORACHA_PROOF
    const spaceDid = import.meta.env.VITE_STORACHA_SPACE_DID

    if (!key || !proof || !spaceDid) {
      console.warn('Storacha configuration missing. Uploads will not work until .env is set up.')
      return false
    }

    try {
      const principal = Signer.parse(key)
      const store = new StoreMemory()
      this.client = await create({ principal, store })

      const parsedProof = await Proof.parse(proof)
      const space = await this.client.addSpace(parsedProof)
      await this.client.setCurrentSpace(space.did())

      this.initialized = true
      console.log('✅ Storacha initialized successfully')
      return true
    } catch (error: any) {
      console.error('❌ Failed to initialize Storacha:', error)
      return false
    }
  }

  /**
   * Upload a file to IPFS via Storacha
   * @param file - The file to upload
   * @param onProgress - Optional progress callback
   * @returns IPFS CID
   */
  async upload(file: File, onProgress?: (progress: number) => void): Promise<string> {
    if (!file) {
      throw new Error('No file provided')
    }

    try {
      if (!this.initialized) {
        const success = await this.initialize()
        if (!success) {
          throw new Error('Storacha not initialized. Check your .env file.')
        }
      }

      if (!this.client) {
        throw new Error('Storacha client not initialized')
      }

      if (onProgress) onProgress(10)

      const cid = await this.client.uploadFile(file)

      if (onProgress) onProgress(100)

      const cidString = cid.toString()
      console.log('✅ Uploaded to IPFS:', cidString)
      return cidString
    } catch (error: any) {
      console.error('❌ Storacha upload failed:', error)
      throw new Error(`Failed to upload to IPFS: ${error.message}`)
    }
  }

  /**
   * Get IPFS gateway URL for a CID
   * @param cid - IPFS CID
   * @param useFallback - Try alternative gateways if primary fails
   * @returns IPFS gateway URL
   */
  getGatewayUrl(cid: string, useFallback = false): string {
    if (useFallback) {
      return IPFS_GATEWAYS[1](cid) // Use w3s.link as fallback
    }
    return `https://w3s.link/ipfs/${cid}`
  }

  /**
   * Fetch JSON from IPFS
   * @param cid - IPFS CID
   * @returns JSON data
   */
  async getJSON(cid: string): Promise<any> {
    try {
      const response = await fetch(this.getGatewayUrl(cid))
      if (!response.ok) {
        throw new Error('Failed to fetch from gateway')
      }
      return await response.json()
    } catch (error) {
      console.error('Failed to fetch IPFS metadata, trying fallback...', error)
      // Try fallback gateway
      try {
        const fallbackUrl = this.getGatewayUrl(cid, true)
        const response = await fetch(fallbackUrl)
        return await response.json()
      } catch (err) {
        throw new Error('Failed to fetch from all gateways')
      }
    }
  }

  /**
   * Check if service is initialized
   */
  isInitialized(): boolean {
    return this.initialized
  }
}

export const storacha = new StorachaService()
