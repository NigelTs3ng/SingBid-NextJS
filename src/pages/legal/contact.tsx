import React, { useState } from 'react';
import Head from 'next/head';
import Header from '../../components/ui/Header';
import Button from '../../components/ui/Button';
import Icon from '../../components/AppIcon';
import Link from 'next/link'; // ✅ Added

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    category: 'general',
    message: ''
  });
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form submitted:', formData);
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 5000);
  };

  return (
    <>
      <Head>
        <title>Contact Us | BidWin Support</title>
        <meta
          name="description"
          content="Get in touch with BidWin support team. We're here to help!"
        />
      </Head>

      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-12 max-w-5xl">
          <div className="mb-12">
            <h1 className="text-4xl font-bold text-foreground mb-4">
              Contact & Support
            </h1>
            <p className="text-lg text-muted-foreground">
              We're here to help. Get in touch with our support team.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
            {/* Support Channels */}
            <div className="bg-card border border-border rounded-lg p-6">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <Icon name="Mail" size={24} className="text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                Email
              </h3>
              <p className="text-muted-foreground mb-4">
                Send us an email anytime
              </p>
              <a
                href="mailto:support@bidwin.sg"
                className="text-primary hover:underline font-medium"
              >
                support@bidwin.sg
              </a>
            </div>

            <div className="bg-card border border-border rounded-lg p-6">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <Icon name="Phone" size={24} className="text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                Phone
              </h3>
              <p className="text-muted-foreground mb-4">
                Call us during business hours
              </p>
              <a
                href="tel:+6512345678"
                className="text-primary hover:underline font-medium"
              >
                +65 1234 5678
              </a>
            </div>

            <div className="bg-card border border-border rounded-lg p-6">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <Icon name="MessageCircle" size={24} className="text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                Live Chat
              </h3>
              <p className="text-muted-foreground mb-4">
                Chat with us in real-time
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => alert('Live chat coming soon')}
              >
                Open Chat
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
            {/* FAQ */}
            <div className="bg-card border border-border rounded-lg p-6">
              <h3 className="text-xl font-semibold text-foreground mb-4">
                Frequently Asked Questions
              </h3>
              <ul className="space-y-3">
                <li>
                  <a href="#" className="text-primary hover:underline">
                    How do I place a bid?
                  </a>
                </li>
                <li>
                  <a href="#" className="text-primary hover:underline">
                    How do payouts work?
                  </a>
                </li>
                <li>
                  <a href="#" className="text-primary hover:underline">
                    What fees do I pay?
                  </a>
                </li>
                <li>
                  <a href="#" className="text-primary hover:underline">
                    How do I report an issue?
                  </a>
                </li>
              </ul>
            </div>

            {/* Help Center */}
            <div className="bg-card border border-border rounded-lg p-6">
              <h3 className="text-xl font-semibold text-foreground mb-4">
                Help Center
              </h3>
              <ul className="space-y-3">
                <li>
                  <Link
                    href="/legal/terms"
                    className="text-primary hover:underline"
                  >
                    Terms of Service
                  </Link>
                </li>
                <li>
                  <Link
                    href="/legal/privacy"
                    className="text-primary hover:underline"
                  >
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <a href="#" className="text-primary hover:underline">
                    How It Works
                  </a>
                </li>
                <li>
                  <a href="#" className="text-primary hover:underline">
                    Seller Guidelines
                  </a>
                </li>
              </ul>
            </div>

            {/* Status */}
            <div className="bg-card border border-border rounded-lg p-6">
              <h3 className="text-xl font-semibold text-foreground mb-4">
                Service Status
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Platform</span>
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    <span className="text-sm text-green-600">
                      All Systems Operational
                    </span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div className="bg-card border border-border rounded-lg p-8">
            <h2 className="text-2xl font-semibold text-foreground mb-6">
              Send us a Message
            </h2>

            {submitted && (
              <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                <div className="flex items-center gap-2">
                  <Icon name="CheckCircle" size={20} className="text-green-600" />
                  <p className="text-green-600 font-medium">
                    Thank you! We'll get back to you soon.
                  </p>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Name
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 bg-muted border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Your name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 bg-muted border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="your@email.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Category
                </label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-muted border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="general">General Inquiry</option>
                  <option value="billing">Billing Question</option>
                  <option value="technical">Technical Issue</option>
                  <option value="dispute">Dispute Resolution</option>
                  <option value="feedback">Feedback</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Subject
                </label>
                <input
                  type="text"
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 bg-muted border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="What is this about?"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Message
                </label>
                <textarea
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  required
                  rows={6}
                  className="w-full px-4 py-2 bg-muted border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  placeholder="Please tell us more..."
                />
              </div>

              <Button type="submit" size="lg">
                Send Message
              </Button>
            </form>
          </div>

          {/* Hours */}
          <div className="mt-12 bg-muted/50 rounded-lg p-8 text-center">
            <h3 className="text-xl font-semibold text-foreground mb-4">
              Support Hours
            </h3>
            <p className="text-muted-foreground mb-6">
              Our support team is available Monday to Friday, 9:00 AM to 6:00 PM SGT.
              For urgent issues, please call our emergency line.
            </p>
            <Button
              variant="outline"
              onClick={() => alert('Emergency line: +65 1234 5678')}
            >
              Call Emergency Support
            </Button>
          </div>
        </main>
      </div>
    </>
  );
}
