'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import Link from 'next/link'

export default function Home() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard')
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-6xl mx-auto">
          {/* Hero Section */}
          <div className="text-center mb-16">
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6">
              Reputation Buddy
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 mb-8">
              AI-Powered Reputation Management for Your Business
            </p>
            <p className="text-lg text-gray-500 dark:text-gray-400 max-w-3xl mx-auto mb-12">
              Monitor reviews, analyze sentiment, generate AI responses, and protect your brand reputation with automated WhatsApp alerts.
            </p>
            <div className="flex gap-4 justify-center">
              <Link href="/register" className="btn-primary text-lg px-8 py-3">
                Get Started Free
              </Link>
              <Link href="/login" className="btn-secondary text-lg px-8 py-3">
                Sign In
              </Link>
            </div>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-3 gap-8 mt-16">
            <div className="card">
              <div className="text-3xl mb-4">🔍</div>
              <h3 className="text-xl font-semibold mb-2">Smart Discovery</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Automatically discovers review sources based on GPS, industry, and language
              </p>
            </div>

            <div className="card">
              <div className="text-3xl mb-4">🤖</div>
              <h3 className="text-xl font-semibold mb-2">AI Responses</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Generate legally-safe, brand-aligned responses with advanced AI
              </p>
            </div>

            <div className="card">
              <div className="text-3xl mb-4">📱</div>
              <h3 className="text-xl font-semibold mb-2">WhatsApp Alerts</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Instant notifications for critical reviews and mentions
              </p>
            </div>

            <div className="card">
              <div className="text-3xl mb-4">📊</div>
              <h3 className="text-xl font-semibold mb-2">Sentiment Analysis</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Track sentiment trends and identify risks before they escalate
              </p>
            </div>

            <div className="card">
              <div className="text-3xl mb-4">🎯</div>
              <h3 className="text-xl font-semibold mb-2">ROI Tracking</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Measure revenue protection and reputation improvements
              </p>
            </div>

            <div className="card">
              <div className="text-3xl mb-4">⚡</div>
              <h3 className="text-xl font-semibold mb-2">24/7 Monitoring</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Continuous monitoring across all platforms and sources
              </p>
            </div>
          </div>

          {/* Pricing Section */}
          <div className="mt-20">
            <h2 className="text-3xl font-bold text-center mb-12">Simple, Transparent Pricing</h2>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="card border-2 border-gray-200">
                <h3 className="text-2xl font-bold mb-2">Lite</h3>
                <div className="text-4xl font-bold mb-4">$29<span className="text-lg text-gray-500">/mo</span></div>
                <ul className="space-y-2 mb-6">
                  <li className="flex items-center gap-2">✓ 3 Locations</li>
                  <li className="flex items-center gap-2">✓ Basic Monitoring</li>
                  <li className="flex items-center gap-2">✓ WhatsApp Alerts</li>
                  <li className="flex items-center gap-2">✓ AI Responses</li>
                </ul>
                <Link href="/register?plan=lite" className="btn-secondary w-full text-center block">
                  Start Free Trial
                </Link>
              </div>

              <div className="card border-4 border-blue-600 relative">
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white px-4 py-1 rounded-full text-sm font-semibold">
                  Most Popular
                </div>
                <h3 className="text-2xl font-bold mb-2">Pro</h3>
                <div className="text-4xl font-bold mb-4">$79<span className="text-lg text-gray-500">/mo</span></div>
                <ul className="space-y-2 mb-6">
                  <li className="flex items-center gap-2">✓ 10 Locations</li>
                  <li className="flex items-center gap-2">✓ Advanced Analytics</li>
                  <li className="flex items-center gap-2">✓ Priority Alerts</li>
                  <li className="flex items-center gap-2">✓ Custom Branding</li>
                </ul>
                <Link href="/register?plan=pro" className="btn-primary w-full text-center block">
                  Start Free Trial
                </Link>
              </div>

              <div className="card border-2 border-gray-200">
                <h3 className="text-2xl font-bold mb-2">Max</h3>
                <div className="text-4xl font-bold mb-4">$199<span className="text-lg text-gray-500">/mo</span></div>
                <ul className="space-y-2 mb-6">
                  <li className="flex items-center gap-2">✓ Unlimited Locations</li>
                  <li className="flex items-center gap-2">✓ White Label</li>
                  <li className="flex items-center gap-2">✓ API Access</li>
                  <li className="flex items-center gap-2">✓ Dedicated Support</li>
                </ul>
                <Link href="/register?plan=max" className="btn-secondary w-full text-center block">
                  Start Free Trial
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
