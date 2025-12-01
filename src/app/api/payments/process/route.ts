import { NextRequest, NextResponse } from 'next/server'
import PaymentService from '@/lib/paymentService'

export async function POST(request: NextRequest) {
  try {
    const { auctionId, winnerId } = await request.json()

    if (!auctionId || !winnerId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const result = await PaymentService.processAuctionPayment(auctionId, winnerId)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      paymentIntentId: result.paymentIntentId,
      clientSecret: result.clientSecret,
    })
  } catch (error) {
    console.error('Payment processing error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}