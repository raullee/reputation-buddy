'use client'

import { useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/DashboardLayout'

export default function AnalyticsPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Analytics & Insights
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Track sentiment trends and ROI metrics
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="card">
            <h3 className="text-lg font-semibold mb-4">Sentiment Trend</h3>
            <div className="h-48 flex items-center justify-center text-gray-400">
              Chart coming soon
            </div>
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold mb-4">Response Time</h3>
            <div className="h-48 flex items-center justify-center text-gray-400">
              Chart coming soon
            </div>
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold mb-4">Platform Distribution</h3>
            <div className="h-48 flex items-center justify-center text-gray-400">
              Chart coming soon
            </div>
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold mb-4">Risk Analysis</h3>
            <div className="h-48 flex items-center justify-center text-gray-400">
              Chart coming soon
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
