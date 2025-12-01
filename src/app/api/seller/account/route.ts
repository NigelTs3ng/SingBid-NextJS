import { NextRequest, NextResponse } from 'next/server'
import PaymentService from '@/lib/paymentService'

export async function POST(request: NextRequest) {
  try {
    const { userId, email } = await request.json()

    if (!userId || !email) {
      return NextResponse.json(
        { error: 'User ID and email are required' },
        { status: 400 }
      )
    }

    const result = await PaymentService.createSellerAccount(userId, email)

    return NextResponse.json({
      success: true,
      accountId: result.accountId,
      onboardingUrl: result.onboardingUrl,
    })
  } catch (error) {
    console.error('Seller account creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create seller account' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    const status = await PaymentService.getSellerAccountStatus(userId)

    return NextResponse.json(status)
  } catch (error) {
    console.error('Error fetching seller account status:', error)
    return NextResponse.json(
      { error: 'Failed to fetch account status' },
      { status: 500 }
    )
  }
}