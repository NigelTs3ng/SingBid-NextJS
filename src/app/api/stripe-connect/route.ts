import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { StripeService } from '../../../lib/stripe'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const cookieStore = await cookies()
    const supabaseAuth = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch {
              // Ignore cookie errors in server components
            }
          },
        },
      }
    )

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Create admin client to update user data
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Get user profile
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profileError || !userProfile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      )
    }

    // Check if user is a seller
    if (userProfile.user_role !== 'seller') {
      return NextResponse.json(
        { error: 'Only sellers can connect to Stripe' },
        { status: 403 }
      )
    }

    // Check if user already has a Stripe account
    if (userProfile.stripe_account_id) {
      // Get account status
      const account = await StripeService.getAccountStatus(userProfile.stripe_account_id)
      
      if (account.charges_enabled && account.payouts_enabled) {
        return NextResponse.json({
          success: true,
          message: 'Stripe account already connected',
          accountId: userProfile.stripe_account_id,
          isComplete: true
        })
      }
    }

    let stripeAccountId = userProfile.stripe_account_id

    // Create Stripe Connect account if it doesn't exist
    if (!stripeAccountId) {
      try {
        const stripeAccount = await StripeService.createConnectedAccount({
          email: userProfile.email,
          name: userProfile.name,
          userId: user.id
        })

        stripeAccountId = stripeAccount.id

        // Update user with Stripe account ID
        const { error: updateError } = await supabaseAdmin
          .from('users')
          .update({ 
            stripe_account_id: stripeAccountId,
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id)

        if (updateError) {
          console.error('Error updating user with Stripe account ID:', updateError)
          return NextResponse.json(
            { error: 'Failed to save Stripe account' },
            { status: 500 }
          )
        }
      } catch (error) {
        console.error('Error creating Stripe account:', error)
        return NextResponse.json(
          { error: 'Failed to create Stripe account' },
          { status: 500 }
        )
      }
    }

    // Create account link for onboarding
    try {
      const refreshUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/seller/stripe-connect?refresh=true`
      const returnUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/seller/stripe-connect?success=true`

      const accountLink = await StripeService.createAccountLink(
        stripeAccountId,
        refreshUrl,
        returnUrl
      )

      return NextResponse.json({
        success: true,
        onboardingUrl: accountLink.url,
        accountId: stripeAccountId
      })

    } catch (error) {
      console.error('Error creating account link:', error)
      return NextResponse.json(
        { error: 'Failed to create onboarding link' },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('Stripe Connect error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET - Check Stripe Connect status
export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const cookieStore = await cookies()
    const supabaseAuth = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch {
              // Ignore cookie errors
            }
          },
        },
      }
    )

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Create admin client
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Get user profile
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('stripe_account_id, stripe_onboarding_complete')
      .eq('id', user.id)
      .single()

    if (profileError) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      )
    }

    if (!userProfile.stripe_account_id) {
      return NextResponse.json({
        isConnected: false,
        isComplete: false
      })
    }

    // Check Stripe account status
    try {
      const account = await StripeService.getAccountStatus(userProfile.stripe_account_id)
      const isComplete = account.charges_enabled && account.payouts_enabled && account.details_submitted

      // Update onboarding status in database if changed
      if (isComplete !== userProfile.stripe_onboarding_complete) {
        await supabaseAdmin
          .from('users')
          .update({ 
            stripe_onboarding_complete: isComplete,
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id)
      }

      return NextResponse.json({
        isConnected: true,
        isComplete,
        accountId: userProfile.stripe_account_id,
        account: {
          charges_enabled: account.charges_enabled,
          payouts_enabled: account.payouts_enabled,
          details_submitted: account.details_submitted,
          requirements: account.requirements
        }
      })

    } catch (error) {
      console.error('Error checking Stripe account status:', error)
      return NextResponse.json({
        isConnected: true,
        isComplete: false,
        error: 'Could not verify account status'
      })
    }

  } catch (error) {
    console.error('Error checking Stripe Connect status:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}