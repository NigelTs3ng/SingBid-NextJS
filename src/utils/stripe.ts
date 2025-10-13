import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
  typescript: true,
})

// Client-side Stripe (for frontend)
export const getStripe = () => {
  if (typeof window !== 'undefined') {
    return import('@stripe/stripe-js').then(({ loadStripe }) => 
      loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)
    )
  }
  return null
}