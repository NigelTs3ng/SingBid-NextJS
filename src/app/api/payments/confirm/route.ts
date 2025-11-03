import { NextRequest, NextResponse } from 'next/server'
import PaymentService from '@/lib/paymentService'

export async function POST(request: NextRequest) {
  try {
    const { paymentIntentId } = await request.json()

    if (!paymentIntentId) {
      return NextResponse.json(
        { error: 'Payment intent ID is required' },
        { status: 400 }
      )
    }

    const success = await PaymentService.confirmPayment(paymentIntentId)

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to confirm payment' },
        { status: 400 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Payment confirmation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}