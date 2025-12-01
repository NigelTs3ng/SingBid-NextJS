import React from 'react'
import Head from 'next/head'
import Header from '../../components/ui/Header'
import Button from '../../components/ui/Button'

export default function PrivacyPage() {
  return (
    <>
      <Head>
        <title>Privacy Policy | BidWin</title>
        <meta name="description" content="Privacy Policy for BidWin auction platform" />
        <meta name="robots" content="noindex, follow" />
      </Head>

      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-12 max-w-4xl">
          <div className="mb-8">
            <Button variant="outline" onClick={() => window.history.back()}>← Back</Button>
          </div>

          <article className="prose prose-invert max-w-none">
            <h1 className="text-4xl font-bold text-foreground mb-8">Privacy Policy</h1>
            <p className="text-muted-foreground mb-6">Last Updated: January 2024</p>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">1. Introduction</h2>
              <p className="text-muted-foreground mb-4">
                BidWin ("we," "us," "our," or "Company") is committed to protecting your privacy. This Privacy Policy explains our data collection, use, and disclosure practices for our Platform.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">2. Information We Collect</h2>
              <p className="text-muted-foreground mb-4">
                <strong>2.1 Personal Information:</strong> When you create an account, we collect your name, email address, phone number, and payment information.
              </p>
              <p className="text-muted-foreground mb-4">
                <strong>2.2 Transactional Data:</strong> We collect information about your auctions, bids, purchases, and payments.
              </p>
              <p className="text-muted-foreground mb-4">
                <strong>2.3 Technical Information:</strong> We automatically collect information about your device, browser, and IP address.
              </p>
              <p className="text-muted-foreground mb-4">
                <strong>2.4 Cookies:</strong> We use cookies to enhance your browsing experience and analyze site usage.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">3. How We Use Your Information</h2>
              <p className="text-muted-foreground mb-4">
                We use your information to:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-4">
                <li>Provide and improve our services</li>
                <li>Process transactions and send related information</li>
                <li>Send marketing communications (with your consent)</li>
                <li>Prevent fraud and ensure platform security</li>
                <li>Comply with legal obligations</li>
                <li>Respond to your inquiries</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">4. Data Sharing</h2>
              <p className="text-muted-foreground mb-4">
                We do not sell your personal information. However, we may share your information with:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-4">
                <li>Payment processors (Stripe) for transaction processing</li>
                <li>Service providers who assist in our operations</li>
                <li>Law enforcement when required by law</li>
                <li>Other users (limited information for auction purposes)</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">5. Data Security</h2>
              <p className="text-muted-foreground mb-4">
                We implement industry-standard security measures including SSL encryption, secure servers, and regular security audits. However, no method of transmission over the Internet is 100% secure.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">6. Your Rights</h2>
              <p className="text-muted-foreground mb-4">
                You have the right to:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-4">
                <li>Access your personal information</li>
                <li>Correct inaccurate data</li>
                <li>Request deletion of your data</li>
                <li>Opt-out of marketing communications</li>
                <li>Request data portability</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">7. Children's Privacy</h2>
              <p className="text-muted-foreground mb-4">
                Our Platform is not directed to children under the age of 13. We do not knowingly collect personal information from children under 13. If we become aware that we have collected such information, we will promptly delete it.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">8. Data Retention</h2>
              <p className="text-muted-foreground mb-4">
                We retain your personal information for as long as necessary to provide our services and fulfill the purposes outlined in this Privacy Policy. You may request deletion at any time.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">9. Third-Party Links</h2>
              <p className="text-muted-foreground mb-4">
                Our Platform may contain links to third-party websites. We are not responsible for their privacy practices. We encourage you to review their privacy policies.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">10. Changes to This Policy</h2>
              <p className="text-muted-foreground mb-4">
                We may update this Privacy Policy from time to time. We will notify you of changes by posting the updated policy and updating the "Last Updated" date.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">11. Contact Us</h2>
              <p className="text-muted-foreground mb-4">
                If you have questions about this Privacy Policy or our privacy practices, please contact us at privacy@bidwin.sg
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
