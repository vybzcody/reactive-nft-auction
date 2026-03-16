import { ref, onMounted, onUnmounted, watch } from 'vue'
import { publicClient } from '../config/clients'
import { AUCTION_CONTRACT_ADDRESS, AUCTION_ABI } from '../config/contract'
import type { Unsubscribe } from 'viem'

interface AuctionEvent {
  type: 'BidPlaced' | 'AuctionExtended' | 'AuctionFinalized' | 'AuctionCreated' | 'ReserveMet' | 'SniperDetected' | 'AuctionAutoFinalized'
  auctionId?: string
  timestamp: number
  txHash?: string
  blockNumber?: number
  // Event-specific data
  bidder?: string
  amount?: string
  endTime?: string
  extended?: boolean
  winner?: string
  reserveMet?: boolean
  seller?: string
  tokenId?: string
  message?: string
}

export function useReactivity() {
  const events = ref<AuctionEvent[]>([])
  const connected = ref(false)
  let unsubscribeFns: Unsubscribe[] = []

  const addEvent = (event: AuctionEvent) => {
    events.value.unshift(event)
    // Keep only last 100 events
    if (events.value.length > 100) {
      events.value = events.value.slice(0, 100)
    }
  }

  const setupEventListeners = () => {
    if (!publicClient) {
      console.error('Public client not available')
      return
    }

    connected.value = true
    console.log('🔗 Connected to on-chain reactivity')

    // Listen to BidPlaced events
    const unsubscribeBidPlaced = publicClient.watchContractEvent({
      address: AUCTION_CONTRACT_ADDRESS,
      abi: AUCTION_ABI,
      eventName: 'BidPlaced',
      onLogs: (logs) => {
        logs.forEach((log) => {
          addEvent({
            type: 'BidPlaced',
            auctionId: log.args.auctionId?.toString(),
            bidder: log.args.bidder,
            amount: log.args.amount?.toString(),
            endTime: log.args.endTime?.toString(),
            extended: log.args.extended,
            timestamp: Date.now(),
            txHash: log.transactionHash,
            blockNumber: log.blockNumber,
          })
        })
      },
    })
    unsubscribeFns.push(unsubscribeBidPlaced)

    // Listen to AuctionExtended events
    const unsubscribeAuctionExtended = publicClient.watchContractEvent({
      address: AUCTION_CONTRACT_ADDRESS,
      abi: AUCTION_ABI,
      eventName: 'AuctionExtended',
      onLogs: (logs) => {
        logs.forEach((log) => {
          addEvent({
            type: 'AuctionExtended',
            auctionId: log.args.auctionId?.toString(),
            oldEndTime: log.args.oldEndTime?.toString(),
            newEndTime: log.args.newEndTime?.toString(),
            timestamp: Date.now(),
            txHash: log.transactionHash,
            blockNumber: log.blockNumber,
          })
        })
      },
    })
    unsubscribeFns.push(unsubscribeAuctionExtended)

    // Listen to AuctionFinalized events
    const unsubscribeAuctionFinalized = publicClient.watchContractEvent({
      address: AUCTION_CONTRACT_ADDRESS,
      abi: AUCTION_ABI,
      eventName: 'AuctionFinalized',
      onLogs: (logs) => {
        logs.forEach((log) => {
          addEvent({
            type: 'AuctionFinalized',
            auctionId: log.args.auctionId?.toString(),
            winner: log.args.winner,
            amount: log.args.amount?.toString(),
            reserveMet: log.args.reserveMet,
            timestamp: Date.now(),
            txHash: log.transactionHash,
            blockNumber: log.blockNumber,
          })
        })
      },
    })
    unsubscribeFns.push(unsubscribeAuctionFinalized)

    // Listen to AuctionCreated events
    const unsubscribeAuctionCreated = publicClient.watchContractEvent({
      address: AUCTION_CONTRACT_ADDRESS,
      abi: AUCTION_ABI,
      eventName: 'AuctionCreated',
      onLogs: (logs) => {
        logs.forEach((log) => {
          addEvent({
            type: 'AuctionCreated',
            auctionId: log.args.auctionId?.toString(),
            tokenId: log.args.tokenId?.toString(),
            seller: log.args.seller,
            endTime: log.args.endTime?.toString(),
            timestamp: Date.now(),
            txHash: log.transactionHash,
            blockNumber: log.blockNumber,
          })
        })
      },
    })
    unsubscribeFns.push(unsubscribeAuctionCreated)

    // Listen to ReserveMet events
    const unsubscribeReserveMet = publicClient.watchContractEvent({
      address: AUCTION_CONTRACT_ADDRESS,
      abi: AUCTION_ABI,
      eventName: 'ReserveMet',
      onLogs: (logs) => {
        logs.forEach((log) => {
          addEvent({
            type: 'ReserveMet',
            auctionId: log.args.auctionId?.toString(),
            bidAmount: log.args.bidAmount?.toString(),
            timestamp: Date.now(),
            txHash: log.transactionHash,
            blockNumber: log.blockNumber,
          })
        })
      },
    })
    unsubscribeFns.push(unsubscribeReserveMet)

    // Listen to SniperDetected events (new on-chain reactivity event)
    const unsubscribeSniperDetected = publicClient.watchContractEvent({
      address: AUCTION_CONTRACT_ADDRESS,
      abi: AUCTION_ABI,
      eventName: 'SniperDetected',
      onLogs: (logs) => {
        logs.forEach((log) => {
          addEvent({
            type: 'SniperDetected',
            auctionId: log.args.auctionId?.toString(),
            bidder: log.args.bidder,
            timestamp: Date.now(),
            txHash: log.transactionHash,
            blockNumber: log.blockNumber,
          })
        })
      },
    })
    unsubscribeFns.push(unsubscribeSniperDetected)

    // Listen to AuctionAutoFinalized events (new on-chain reactivity event)
    const unsubscribeAuctionAutoFinalized = publicClient.watchContractEvent({
      address: AUCTION_CONTRACT_ADDRESS,
      abi: AUCTION_ABI,
      eventName: 'AuctionAutoFinalized',
      onLogs: (logs) => {
        logs.forEach((log) => {
          addEvent({
            type: 'AuctionAutoFinalized',
            auctionId: log.args.auctionId?.toString(),
            timestamp: Date.now(),
            txHash: log.transactionHash,
            blockNumber: log.blockNumber,
          })
        })
      },
    })
    unsubscribeFns.push(unsubscribeAuctionAutoFinalized)
  }

  const cleanupEventListeners = () => {
    unsubscribeFns.forEach((unsubscribe) => {
      try {
        unsubscribe()
      } catch (error) {
        console.error('Error unsubscribing from event:', error)
      }
    })
    unsubscribeFns = []
    connected.value = false
    console.log('❌ Disconnected from on-chain reactivity')
  }

  onMounted(setupEventListeners)
  onUnmounted(cleanupEventListeners)

  return {
    events,
    connected
  }
}
