import { ref, onMounted, onUnmounted } from 'vue'
import { publicClient } from '../config/clients'
import { AUCTION_CONTRACT_ADDRESS, AUCTION_ABI } from '../config/contract'

interface AuctionEvent {
  type: 'BidPlaced' | 'AuctionCreated' | 'AuctionFinalized'
  auctionId?: string
  timestamp: number
  txHash?: string
  blockNumber?: string
  bidder?: string
  amount?: string
  endTime?: string
  extended?: boolean
  winner?: string
  reserveMet?: boolean
  seller?: string
  tokenId?: string
}

export function useReactivity() {
  const events = ref<AuctionEvent[]>([])
  const connected = ref(false)
  let unsubscribeFns: (() => void)[] = []

  const addEvent = (event: AuctionEvent) => {
    console.log('📬 Event received:', event.type, 'auctionId:', event.auctionId)
    // Avoid duplicates
    const isDuplicate = events.value.some(e => 
      e.type === event.type && 
      e.auctionId === event.auctionId && 
      e.txHash === event.txHash
    )
    if (!isDuplicate) {
      events.value.unshift(event)
      if (events.value.length > 100) {
        events.value = events.value.slice(0, 100)
      }
    }
  }

  const setupEventListeners = async () => {
    if (!publicClient) {
      console.error('❌ Public client not available')
      connected.value = false
      return
    }

    try {
      const blockNum = await publicClient.getBlockNumber()
      console.log('🔗 Connected to Somnia testnet, block:', blockNum.toString())
      console.log('📡 Watching contract:', AUCTION_CONTRACT_ADDRESS)
      connected.value = true

      // BidPlaced - no specific filter to catch all bids
      const unsub1 = publicClient.watchContractEvent({
        address: AUCTION_CONTRACT_ADDRESS,
        abi: AUCTION_ABI,
        eventName: 'BidPlaced',
        onLogs: (logs) => {
          console.log('📍 BidPlaced event:', logs.length, 'logs')
          logs.forEach(log => {
            console.log('  - auctionId:', log.args.auctionId?.toString(), 'bidder:', log.args.bidder, 'amount:', log.args.amount?.toString())
            addEvent({
              type: 'BidPlaced',
              auctionId: log.args.auctionId?.toString(),
              bidder: log.args.bidder,
              amount: log.args.amount?.toString(),
              endTime: log.args.endTime?.toString(),
              extended: log.args.extended,
              timestamp: Date.now(),
              txHash: log.transactionHash,
              blockNumber: log.blockNumber?.toString(),
            })
          })
        },
      })
      unsubscribeFns.push(unsub1)

      // AuctionCreated
      const unsub2 = publicClient.watchContractEvent({
        address: AUCTION_CONTRACT_ADDRESS,
        abi: AUCTION_ABI,
        eventName: 'AuctionCreated',
        onLogs: (logs) => {
          console.log('📍 AuctionCreated event:', logs.length, 'logs')
          logs.forEach(log => addEvent({
            type: 'AuctionCreated',
            auctionId: log.args.auctionId?.toString(),
            tokenId: log.args.tokenId?.toString(),
            seller: log.args.seller,
            timestamp: Date.now(),
            txHash: log.transactionHash,
            blockNumber: log.blockNumber?.toString(),
          }))
        },
      })
      unsubscribeFns.push(unsub2)

      // AuctionFinalized
      const unsub3 = publicClient.watchContractEvent({
        address: AUCTION_CONTRACT_ADDRESS,
        abi: AUCTION_ABI,
        eventName: 'AuctionFinalized',
        onLogs: (logs) => {
          console.log('📍 AuctionFinalized event:', logs.length, 'logs')
          logs.forEach(log => addEvent({
            type: 'AuctionFinalized',
            auctionId: log.args.auctionId?.toString(),
            winner: log.args.winner,
            amount: log.args.amount?.toString(),
            reserveMet: log.args.reserveMet,
            timestamp: Date.now(),
            txHash: log.transactionHash,
            blockNumber: log.blockNumber?.toString(),
          }))
        },
      })
      unsubscribeFns.push(unsub3)

      console.log('✅ Event listeners active - watching for BidPlaced, AuctionCreated, AuctionFinalized')
    } catch (err) {
      console.error('❌ Setup failed:', err)
      connected.value = false
    }
  }

  const cleanup = () => {
    unsubscribeFns.forEach(fn => {
      try { fn() } catch (e) { console.error('Unsub error:', e) }
    })
    unsubscribeFns = []
    connected.value = false
    console.log('❌ Disconnected')
  }

  onMounted(setupEventListeners)
  onUnmounted(cleanup)

  return { events, connected }
}
