import { keccak256, toHex } from 'viem'

// Event signatures from ReactiveNFTAuction.sol
export const EVENT_SIGNATURES = {
  BidPlaced: 'BidPlaced(uint256,address,uint256,uint256,bool)',
  AuctionFinalized: 'AuctionFinalized(uint256,address,uint256,bool,bool,bool)',
  ReserveMet: 'ReserveMet(uint256,uint256)',
  AuctionExtended: 'AuctionExtended(uint256,uint256,uint256)',
  PaymentSent: 'PaymentSent(uint256,address,uint256)',
  AuctionCreated: 'AuctionCreated(uint256,uint256,address,address,uint256,uint256,uint256)',
} as const

// Event topic hashes (used for filtering)
export const EVENT_TOPICS = {
  BidPlaced: keccak256(toHex(EVENT_SIGNATURES.BidPlaced)),
  AuctionFinalized: keccak256(toHex(EVENT_SIGNATURES.AuctionFinalized)),
  ReserveMet: keccak256(toHex(EVENT_SIGNATURES.ReserveMet)),
  AuctionExtended: keccak256(toHex(EVENT_SIGNATURES.AuctionExtended)),
  PaymentSent: keccak256(toHex(EVENT_SIGNATURES.PaymentSent)),
  AuctionCreated: keccak256(toHex(EVENT_SIGNATURES.AuctionCreated)),
} as const

// Notification types
export type NotificationType = 
  | 'bid-placed'
  | 'outbid'
  | 'reserve-met'
  | 'auction-extended'
  | 'auction-ended-winner'
  | 'auction-ended-seller'
  | 'payment-sent'

export interface Notification {
  id: string
  type: NotificationType
  title: string
  message: string
  timestamp: number
  auctionId?: number
  read: boolean
}
