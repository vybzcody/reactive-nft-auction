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

const STORAGE_KEY = 'nft-auction-events'
const MAX_STORED_EVENTS = 50

export function useReactivity() {
  const events = ref<AuctionEvent[]>([])
  const connected = ref(false)
  let unsubscribeFns: (() => void)[] = []

  // Load events from localStorage
  const loadStoredEvents = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        // Only keep events from last 24 hours
        const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000
        events.value = parsed.filter((e: AuctionEvent) => e.timestamp > oneDayAgo)
        console.log('📦 Loaded', events.value.length, 'events from localStorage')
      }
    } catch (err) {
      console.error('Failed to load stored events:', err)
    }
  }

  // Save events to localStorage
  const saveStoredEvents = () => {
    try {
      const toStore = events.value.slice(0, MAX_STORED_EVENTS)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore))
    } catch (err) {
      console.error('Failed to save events:', err)
    }
  }

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
      if (events.value.length > MAX_STORED_EVENTS) {
        events.value = events.value.slice(0, MAX_STORED_EVENTS)
      }
      saveStoredEvents()
    }
  }

  const fetchPastEvents = async () => {
    try {
      const latestBlock = await publicClient.getBlockNumber()
      const fromBlock = latestBlock - BigInt(500) // Last 500 blocks (~2.5 hours at 30s blocks)
      
      console.log('📜 Fetching past events from block', fromBlock.toString(), 'to', latestBlock.toString())

      // Fetch BidPlaced events
      const bidEvents = await publicClient.getContractEvents({
        address: AUCTION_CONTRACT_ADDRESS,
        abi: AUCTION_ABI,
        eventName: 'BidPlaced',
        fromBlock,
        toBlock: latestBlock,
      })
      
      bidEvents.forEach(log => {
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

      // Fetch AuctionCreated events
      const createdEvents = await publicClient.getContractEvents({
        address: AUCTION_CONTRACT_ADDRESS,
        abi: AUCTION_ABI,
        eventName: 'AuctionCreated',
        fromBlock,
        toBlock: latestBlock,
      })
      
      createdEvents.forEach(log => {
        addEvent({
          type: 'AuctionCreated',
          auctionId: log.args.auctionId?.toString(),
          tokenId: log.args.tokenId?.toString(),
          seller: log.args.seller,
          timestamp: Date.now(),
          txHash: log.transactionHash,
          blockNumber: log.blockNumber?.toString(),
        })
      })

      // Fetch AuctionFinalized events
      const finalizedEvents = await publicClient.getContractEvents({
        address: AUCTION_CONTRACT_ADDRESS,
        abi: AUCTION_ABI,
        eventName: 'AuctionFinalized',
        fromBlock,
        toBlock: latestBlock,
      })
      
      finalizedEvents.forEach(log => {
        addEvent({
          type: 'AuctionFinalized',
          auctionId: log.args.auctionId?.toString(),
          winner: log.args.winner,
          amount: log.args.amount?.toString(),
          reserveMet: log.args.reserveMet,
          timestamp: Date.now(),
          txHash: log.transactionHash,
          blockNumber: log.blockNumber?.toString(),
        })
      })

      console.log('✅ Loaded past events:', bidEvents.length, 'bids,', createdEvents.length, 'created,', finalizedEvents.length, 'finalized')
    } catch (err) {
      console.error('Failed to fetch past events:', err)
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

      // Load stored events first
      loadStoredEvents()

      // Fetch recent past events
      await fetchPastEvents()

      // BidPlaced - live listener
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

      // AuctionCreated - live listener
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

      // AuctionFinalized - live listener
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
