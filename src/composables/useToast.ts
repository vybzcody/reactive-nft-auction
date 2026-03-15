import { ref } from 'vue'

interface Toast {
  id: number
  type: 'outbid' | 'new-bid' | 'auction-ending' | 'auction-won' | 'auction-created' | 'success' | 'error' | 'price-alert' | 'proxy-bid'
  title: string
  message: string
  timestamp: number
  auctionId?: number
  priority?: 'low' | 'normal' | 'high' | 'critical'
}

let toastId = 0
const toasts = ref<Toast[]>([])

export function useToast() {
  const addToast = (toast: Omit<Toast, 'id' | 'timestamp'>) => {
    const newToast: Toast = {
      ...toast,
      id: toastId++,
      timestamp: Date.now(),
      priority: toast.priority || 'normal',
    }
    toasts.value.push(newToast)

    // Auto-dismiss after 5 seconds (10 for critical)
    const dismissTime = toast.priority === 'critical' ? 10000 : 5000
    setTimeout(() => {
      dismissToast(newToast.id)
    }, dismissTime)

    return newToast.id
  }

  const dismissToast = (id: number) => {
    toasts.value = toasts.value.filter(t => t.id !== id)
  }

  const dismissAllToasts = () => {
    toasts.value = []
  }

  // Smart notification helpers
  const notifyOutbid = (auctionId: number, currentBid: string, userMax?: string) => {
    const message = userMax 
      ? `Your max bid of ${userMax} was exceeded. Current: ${currentBid} STT`
      : `Current bid: ${currentBid} STT`
    
    return addToast({
      type: 'outbid',
      title: '🚨 You\'ve Been Outbid!',
      message,
      auctionId,
      priority: 'critical',
    })
  }

  const notifyAuctionEnding = (auctionId: number, timeLeft: string) => {
    return addToast({
      type: 'auction-ending',
      title: '⏰ Auction Ending Soon',
      message: `Auction ends in ${timeLeft} - Place your bid now!`,
      auctionId,
      priority: 'high',
    })
  }

  const notifyNewBid = (auctionId: number, bidder: string, amount: string) => {
    return addToast({
      type: 'new-bid',
      title: '💰 New Bid Placed',
      message: `${bidder.slice(0, 6)}...${bidder.slice(-4)} bid ${amount} STT`,
      auctionId,
      priority: 'normal',
    })
  }

  const notifyAuctionWon = (auctionId: number, amount: string) => {
    return addToast({
      type: 'auction-won',
      title: '🏆 Auction Won!',
      message: `Congratulations! You won the auction for ${amount} STT`,
      auctionId,
      priority: 'high',
    })
  }

  const notifyProxyBid = (auctionId: number, currentBid: string, maxBid: string) => {
    return addToast({
      type: 'proxy-bid',
      title: '🤖 Auto-Bid Active',
      message: `System bidding for you up to ${maxBid} STT. Current: ${currentBid} STT`,
      auctionId,
      priority: 'normal',
    })
  }

  const notifyPriceAlert = (auctionId: number, message: string) => {
    return addToast({
      type: 'price-alert',
      title: '📊 Price Alert',
      message,
      auctionId,
      priority: 'low',
    })
  }

  return {
    toasts,
    addToast,
    dismissToast,
    dismissAllToasts,
    // Smart notifications
    notifyOutbid,
    notifyAuctionEnding,
    notifyNewBid,
    notifyAuctionWon,
    notifyProxyBid,
    notifyPriceAlert,
  }
}
