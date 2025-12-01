import React from 'react'
import Head from 'next/head'
import Header from '../../components/ui/Header'
import Button from '../../components/ui/Button'

export default function TermsPage() {
  return (
    <>
      <Head>
        <title>Terms of Service | BidWin</title>
        <meta name="description" content="Terms of Service for BidWin auction platform" />
        <meta name="robots" content="noindex, follow" />
      </Head>

      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-12 max-w-4xl">
          <div className="mb-8">
            <Button variant="outline" onClick={() => window.history.back()}>← Back</Button>
          </div>

          <article className="prose prose-invert max-w-none">
            <h1 className="text-4xl font-bold text-foreground mb-8">Terms of Service</h1>
            <p className="text-muted-foreground mb-6">Last Updated: January 2024</p>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">1. Agreement to Terms</h2>
              <p className="text-muted-foreground mb-4">
                By accessing and using BidWin (the "Platform"), you accept and agree to be bound by and comply with these Terms of Service and our Privacy Policy. If you do not agree to abide by the above, please do not use this service.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">2. Use License</h2>
              <p className="text-muted-foreground mb-4">
                Permission is granted to temporarily download one copy of the materials (information or software) on BidWin for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title, and under this license you may not:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-4">
                <li>Modify or copy the materials</li>
                <li>Use the materials for any commercial purpose or for any public display</li>
                <li>Attempt to reverse engineer any software contained on BidWin</li>
                <li>Remove any copyright or other proprietary notations from the materials</li>
                <li>Transferring the materials to another person or "mirror" the materials on any other server</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">3. Auction Rules</h2>
              <p className="text-muted-foreground mb-4">
                <strong>3.1 Listing Requirements:</strong> All items must be accurately described with clear photos. Prohibited items include counterfeit goods, hazardous materials, and items violating local laws.
              </p>
              <p className="text-muted-foreground mb-4">
                <strong>3.2 Bidding Rules:</strong> All bids are binding. Cancellation of bids is not permitted except under exceptional circumstances approved by BidWin.
              </p>
              <p className="text-muted-foreground mb-4">
                <strong>3.3 Payment Requirements:</strong> Winners must complete payment within 48 hours of auction end.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">4. Payment & Fees</h2>
              <p className="text-muted-foreground mb-4">
                <strong>4.1 Transaction Fees:</strong> BidWin charges a 5% transaction fee on all completed auctions. Premium members pay 2.5%.
              </p>
              <p className="text-muted-foreground mb-4">
                <strong>4.2 Payout Policy:</strong> Payouts are processed within 2-7 business days to verified seller accounts.
              </p>
              <p className="text-muted-foreground mb-4">
                <strong>4.3 Currency:</strong> All transactions are in US Dollars (USD).
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">5. Buyer Protection</h2>
              <p className="text-muted-foreground mb-4">
                All purchases on BidWin are protected. If you do not receive your item or it arrives damaged/not as described, you can open a dispute within 14 days. BidWin will investigate and resolve within 48 hours.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">6. Disclaimer of Warranties</h2>
              <p className="text-muted-foreground mb-4">
                The materials on BidWin are provided on an 'as is' basis. BidWin makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties including, without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">7. Limitations of Liability</h2>
              <p className="text-muted-foreground mb-4">
                In no event shall BidWin or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on BidWin.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">8. Accuracy of Materials</h2>
              <p className="text-muted-foreground mb-4">
                The materials appearing on BidWin could include technical, typographical, or photographic errors. BidWin does not warrant that any of the materials on BidWin are accurate, complete, or current.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">9. Modifications</h2>
              <p className="text-muted-foreground mb-4">
                BidWin may revise these Terms of Service for its Platform at any time without notice. By using this Platform, you are agreeing to be bound by the then current version of these Terms of Service.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">10. Governing Law</h2>
              <p className="text-muted-foreground mb-4">
                These Terms and Conditions and any separate agreements we may enter into with you are governed by and construed in accordance with the laws of Singapore, and you irrevocably submit to the exclusive jurisdiction of the courts located in Singapore.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">11. Contact Information</h2>
              <p className="text-muted-foreground mb-4">
                If you have any questions about these Terms of Service, please contact us at support@bidwin.sg
              </p>
            </section>
          </article>

          <div className="mt-12 pt-8 border-t border-border">
            <Button variant="outline" onClick={() => window.history.back()}>← Back</Button>
          </div>
        </main>
      </div>
    </>
  )
}
