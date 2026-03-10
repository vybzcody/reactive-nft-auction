/**
 * Bid History Tracking
 * 
 * Tracks and displays bid history for auctions
 */

export interface BidRecord {
  id: number
  bidder: string
  amount: bigint
  timestamp: number
  txHash?: string
  isProxy?: boolean
}

// In-memory storage for bid history (in production, this would be indexed from events)
const bidHistoryCache = new Map<number, BidRecord[]>()

export class BidHistoryService {
  /**
   * Add a bid to history
   */
  addBid(auctionId: number, bid: Omit<BidRecord, 'id'>) {
    const history = bidHistoryCache.get(auctionId) || []
    const newBid: BidRecord = {
      ...bid,
      id: history.length + 1,
    }
    history.push(newBid)
    bidHistoryCache.set(auctionId, history)
    return newBid
  }

  /**
   * Get bid history for an auction
   */
  getHistory(auctionId: number): BidRecord[] {
    return bidHistoryCache.get(auctionId) || []
  }

  /**
   * Get bid count
   */
  getBidCount(auctionId: number): number {
    const history = bidHistoryCache.get(auctionId) || []
    return history.length
  }

  /**
   * Get highest bid
   */
  getHighestBid(auctionId: number): bigint | null {
    const history = bidHistoryCache.get(auctionId) || []
    if (history.length === 0) return null
    return history.reduce((max, bid) => bid.amount > max ? bid.amount : max, 0n)
  }

  /**
   * Get unique bidders count
   */
  getUniqueBidCount(auctionId: number): number {
    const history = bidHistoryCache.get(auctionId) || []
    const uniqueBidders = new Set(history.map(b => b.bidder.toLowerCase()))
    return uniqueBidders.size
  }

  /**
   * Get bid activity summary
   */
  getActivitySummary(auctionId: number): {
    totalBids: number
    uniqueBidders: number
    highestBid: bigint
    averageBid: bigint
    lastBidTime: number | null
  } {
    const history = bidHistoryCache.get(auctionId) || []
    
    if (history.length === 0) {
      return {
        totalBids: 0,
        uniqueBidders: 0,
        highestBid: 0n,
        averageBid: 0n,
        lastBidTime: null,
      }
    }

    const total = history.reduce((sum, bid) => sum + bid.amount, 0n)
    const uniqueBidders = new Set(history.map(b => b.bidder.toLowerCase()))

    return {
      totalBids: history.length,
      uniqueBidders: uniqueBidders.size,
      highestBid: history[history.length - 1].amount,
      averageBid: total / BigInt(history.length),
      lastBidTime: history[history.length - 1].timestamp,
    }
  }

  /**
   * Clear history (for testing)
   */
  clear(auctionId?: number) {
    if (auctionId !== undefined) {
      bidHistoryCache.delete(auctionId)
    } else {
      bidHistoryCache.clear()
    }
  }
}

export const bidHistory = new BidHistoryService()
