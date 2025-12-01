import React, { useState } from 'react'
import Header from '../../components/ui/Header'
import Button from '../../components/ui/Button'
import Icon from '../../components/AppIcon'
import Link from 'next/link'

export default function HelpSupport() {
  const [activeTab, setActiveTab] = useState('bidder')
  const [expandedFaq, setExpandedFaq] = useState(null)

  const bidderFaqs = [
    {
      id: 'b1',
      question: 'How do I place a bid on an auction?',
      answer: 'Browse the auctions page, find an item you like, click on it to view details, and click the "Place Bid" button. Enter your bid amount (must be higher than the current price and follow the minimum increment rules), select a payment method, and confirm.'
    },
    {
      id: 'b2',
      question: 'What are the bid increment rules?',
      answer: 'Bid increments depend on the current price: Bids under $100 require $1 minimum increment, $100-$499 require $5 increment, $500-$999 require $10 increment, and $1000+ require $25 increment.'
    },
    {
      id: 'b3',
      question: 'How are my funds held?',
      answer: 'When you place a bid, the funds are authorized (held) but not charged immediately. If you\'re outbid, the authorization is released. Only when you win an auction and it ends, the bid amount is captured and charged to your account.'
    },
    {
      id: 'b4',
      question: 'What if I win an auction?',
      answer: 'Congratulations! Your bid will be captured automatically when the auction ends. The seller will be notified, and you\'ll see the transaction in your payment dashboard. Make sure your payment method has sufficient funds.'
    },
    {
      id: 'b5',
      question: 'Can I cancel my bid?',
      answer: 'You cannot cancel a bid once placed. However, if you\'re outbid by another bidder, your authorization will be automatically released and you won\'t be charged.'
    },
    {
      id: 'b6',
      question: 'How do I view my bid history?',
      answer: 'Click on "My Bids" in the header menu to see all your active and past bids. You can filter by status (active, won, outbid) and see details for each bid.'
    },
    {
      id: 'b7',
      question: 'What payment methods are accepted?',
      answer: 'We accept all major credit and debit cards (Visa, Mastercard, American Express) via Stripe. Your payment information is securely encrypted and stored.'
    },
    {
      id: 'b8',
      question: 'How do I update my profile?',
      answer: 'Go to Profile Settings in the header menu. You can update your name, upload a profile picture, and change your password. Your email cannot be changed through this interface.'
    }
  ]

  const sellerFaqs = [
    {
      id: 's1',
      question: 'How do I create an auction?',
      answer: 'Click "Create Auction" in the header menu. Fill in the item details (title, description, starting price, end time), upload high-quality images, and publish. Your auction will go live immediately.'
    },
    {
      id: 's2',
      question: 'What information should I provide?',
      answer: 'Include a clear title, detailed description of the item\'s condition, starting price, auction duration, and at least one clear photo. The more details you provide, the more bids you\'ll likely receive.'
    },
    {
      id: 's3',
      question: 'How do I upload images?',
      answer: 'Click "Upload Images" when creating an auction. You can upload multiple images (JPG, PNG, GIF). The first image will be set as the primary image displayed on listings. Drag to reorder images as needed.'
    },
    {
      id: 's4',
      question: 'How do I end an auction?',
      answer: 'Go to your seller dashboard, find the active auction, and click "End Auction". The highest bidder wins, and their payment will be captured. The auction status changes to completed.'
    },
    {
      id: 's5',
      question: 'How do I receive my funds?',
      answer: 'You must connect your Stripe account first. Go to Dashboard > Connect Stripe Account and complete the setup. Once connected, funds from winning bids (minus 5% platform fee) are transferred to your Stripe account automatically when auctions end.'
    },
    {
      id: 's6',
      question: 'What is the platform fee?',
      answer: 'BidWin charges a 5% platform fee on the winning bid amount. This covers payment processing, platform maintenance, and seller protection. For example, a $100 winning bid results in $95 to you and $5 to BidWin.'
    },
    {
      id: 's7',
      question: 'How do I view my earnings?',
      answer: 'Go to your seller dashboard to see all auctions and their status. Click "Analytics" to view detailed earnings reports, including successful sales, total revenue, and platform fees.'
    },
    {
      id: 's8',
      question: 'Can I edit an active auction?',
      answer: 'You cannot edit the core details (title, description, starting price) of an active auction. However, you can add more images or end the auction early if needed.'
    },
    {
      id: 's9',
      question: 'What if there are no bids?',
      answer: 'If your auction reaches the end time with no bids, it ends with status "ended" but no winner. You can re-list the item immediately or adjust the starting price and try again.'
    },
    {
      id: 's10',
      question: 'How long can my auction run?',
      answer: 'You can set the auction duration to any length you want - from a few hours to several weeks. Choose based on your item\'s popularity and demand.'
    },
    {
      id: 's11',
      question: 'How do I contact support?',
      answer: 'Use the contact form below or email support@bidwin.sg with your issue. Include your auction ID if related to a specific listing. We typically respond within 24 hours.'
    }
  ]

  const ContactForm = () => (
    <div className="bg-card border border-border rounded-lg p-6 mt-8">
      <h3 className="text-xl font-semibold text-foreground mb-4">Contact Support</h3>
      <form className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Subject</label>
          <input
            type="text"
            placeholder="What do you need help with?"
            className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Message</label>
          <textarea
            rows={5}
            placeholder="Describe your issue in detail..."
            className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <Button type="submit" className="w-full">Send Message</Button>
      </form>
    </div>
  )

  const FaqItem = ({ faq }) => (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        onClick={() => setExpandedFaq(expandedFaq === faq.id ? null : faq.id)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-accent transition-colors text-left"
      >
        <span className="font-medium text-foreground">{faq.question}</span>
        <Icon
          name={expandedFaq === faq.id ? 'ChevronUp' : 'ChevronDown'}
          size={20}
          className="text-muted-foreground"
        />
      </button>
      {expandedFaq === faq.id && (
        <div className="px-4 py-3 bg-muted/50 border-t border-border">
          <p className="text-foreground">{faq.answer}</p>
        </div>
      )}
    </div>
  )

  const faqs = activeTab === 'bidder' ? bidderFaqs : sellerFaqs

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Help & Support</h1>
          <p className="text-muted-foreground">Find answers to common questions and get in touch with our support team</p>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-4 mb-8">
          <button
            onClick={() => setActiveTab('bidder')}
            className={`px-6 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'bidder'
                ? 'bg-primary text-primary-foreground'
                : 'bg-card border border-border text-foreground hover:bg-accent'
            }`}
          >
            <Icon name="Users" size={18} className="inline mr-2" />
            Bidder Guide
          </button>
          <button
            onClick={() => setActiveTab('seller')}
            className={`px-6 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'seller'
                ? 'bg-primary text-primary-foreground'
                : 'bg-card border border-border text-foreground hover:bg-accent'
            }`}
          >
            <Icon name="Store" size={18} className="inline mr-2" />
            Seller Guide
          </button>
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Link href="/auction-listings">
            <div className="bg-card border border-border rounded-lg p-4 hover:translate-y-[-2px] hover:border-primary transition-all cursor-pointer">
              <Icon name="Search" size={24} className="text-primary mb-2" />
              <h3 className="font-semibold text-foreground">Browse Auctions</h3>
              <p className="text-sm text-muted-foreground">Find items to bid on</p>
            </div>
          </Link>
          
          {activeTab === 'seller' && (
            <Link href="/create-auction">
              <div className="bg-card border border-border rounded-lg p-4 hover:translate-y-[-2px] hover:border-primary transition-all cursor-pointer">
                <Icon name="Plus" size={24} className="text-primary mb-2" />
                <h3 className="font-semibold text-foreground">Create Auction</h3>
                <p className="text-sm text-muted-foreground">Start selling today</p>
              </div>
            </Link>
          )}

          <Link href="/profile">
            <div className="bg-card border border-border rounded-lg p-4 hover:translate-y-[-2px] hover:border-primary transition-all cursor-pointer">
              <Icon name="User" size={24} className="text-primary mb-2" />
              <h3 className="font-semibold text-foreground">Profile Settings</h3>
              <p className="text-sm text-muted-foreground">Manage your account</p>
            </div>
          </Link>

          <div className="bg-card border border-border rounded-lg p-4">
            <Icon name="Mail" size={24} className="text-primary mb-2" />
            <h3 className="font-semibold text-foreground">Email Support</h3>
            <p className="text-sm text-muted-foreground">support@bidwin.sg</p>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="bg-card border border-border rounded-lg p-6 mb-8">
          <h2 className="text-2xl font-bold text-foreground mb-6">
            Frequently Asked Questions
          </h2>
          <div className="space-y-3">
            {faqs.map((faq) => (
              <FaqItem key={faq.id} faq={faq} />
            ))}
          </div>
        </div>

        {/* Contact Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-4">Get Help</h2>
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Icon name="MessageCircle" size={24} className="text-primary" />
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">Live Chat</h3>
                  <p className="text-sm text-muted-foreground">Chat with our support team in real-time during business hours (9 AM - 6 PM SGT)</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Icon name="Mail" size={24} className="text-primary" />
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">Email Support</h3>
                  <p className="text-sm text-muted-foreground">Email us at support@bidwin.sg and we'll respond within 24 hours</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Icon name="HelpCircle" size={24} className="text-primary" />
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">Documentation</h3>
                  <p className="text-sm text-muted-foreground">Check our guides and tutorials for step-by-step instructions</p>
                </div>
              </div>
            </div>
          </div>

          <ContactForm />
        </div>

        {/* Additional Resources */}
        <div className="bg-accent/50 border border-border rounded-lg p-6">
          <h3 className="text-xl font-bold text-foreground mb-4">Additional Resources</h3>
          <ul className="space-y-2">
            <li className="flex items-center gap-2 text-foreground">
              <Icon name="CheckCircle" size={18} className="text-green-500" />
              <Link href="/legal/terms" className="hover:text-primary">Terms & Conditions</Link>
            </li>
            <li className="flex items-center gap-2 text-foreground">
              <Icon name="CheckCircle" size={18} className="text-green-500" />
              <Link href="/legal/privacy" className="hover:text-primary">Privacy Policy</Link>
            </li>
            <li className="flex items-center gap-2 text-foreground">
              <Icon name="CheckCircle" size={18} className="text-green-500" />
              <span>Report an issue: abuse@bidwin.sg</span>
            </li>
            <li className="flex items-center gap-2 text-foreground">
              <Icon name="CheckCircle" size={18} className="text-green-500" />
              <span>For sales inquiries: sales@bidwin.sg</span>
            </li>
          </ul>
        </div>
      </main>
    </div>
  )
}
