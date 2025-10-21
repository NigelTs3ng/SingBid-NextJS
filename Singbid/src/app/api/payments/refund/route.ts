import { NextRequest, NextResponse } from 'next/server'
import PaymentService from '@/lib/paymentService'

export async function POST(request: NextRequest) {
  try {
    const { paymentId, reason } = await request.json()

    if (!paymentId || !reason) {
      return NextResponse.json(
        { error: 'Payment ID and reason are required' },
        { status: 400 }
      )
    }

    const result = await PaymentService.processRefund(paymentId, reason)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Refund processing error:', error)
    return NextResponse.json(
      { error: 'Failed to process refund' },
      { status: 500 }
    )
  }
}