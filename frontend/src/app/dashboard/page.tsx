'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/DashboardLayout'
import { apiClient } from '@/lib/api'

interface Stats {
  totalMentions: number
  pendingResponses: number
  averageSentiment: number
  totalLocations: number
}

export default function DashboardPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [stats, setStats] = useState<Stats>({
    totalMentions: 0,
    pendingResponses: 0,
    averageSentiment: 0,
    totalLocations: 0,
  })
  const [loadingStats, setLoadingStats] = useState(true)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  useEffect(() => {
    if (user) {
      fetchStats()
    }
  }, [user])

  const fetchStats = async () => {
    try {
      const response = await apiClient.get('/api/analytics/stats')
      setStats(response.data)
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    } finally {
      setLoadingStats(false)
    }
  }

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
            Welcome back, {user.firstName}!
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Here's what's happening with your reputation
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Mentions</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                  {loadingStats ? '...' : stats.totalMentions}
                </p>
              </div>
              <div className="text-4xl">💬</div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Pending Responses</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                  {loadingStats ? '...' : stats.pendingResponses}
                </p>
              </div>
              <div className="text-4xl">⏳</div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Avg Sentiment</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                  {loadingStats ? '...' : (stats.averageSentiment * 100).toFixed(0)}%
                </p>
              </div>
              <div className="text-4xl">
                {stats.averageSentiment > 0.6 ? '😊' : stats.averageSentiment > 0.4 ? '😐' : '😟'}
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Locations</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                  {loadingStats ? '...' : stats.totalLocations}
                </p>
              </div>
              <div className="text-4xl">📍</div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="card">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            Recent Activity
          </h2>
          <div className="space-y-4">
            <p className="text-gray-600 dark:text-gray-400 text-center py-8">
              No recent activity to display. Start monitoring your locations to see activity here.
            </p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-3 gap-6">
          <button className="card hover:shadow-lg transition-shadow text-left">
            <div className="text-3xl mb-3">📍</div>
            <h3 className="text-lg font-semibold mb-2">Add Location</h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Add a new business location to monitor
            </p>
          </button>

          <button className="card hover:shadow-lg transition-shadow text-left">
            <div className="text-3xl mb-3">🔍</div>
            <h3 className="text-lg font-semibold mb-2">Discover Sources</h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Find new review sources automatically
            </p>
          </button>

          <button className="card hover:shadow-lg transition-shadow text-left">
            <div className="text-3xl mb-3">📊</div>
            <h3 className="text-lg font-semibold mb-2">View Analytics</h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              See detailed insights and trends
            </p>
          </button>
        </div>
      </div>
    </DashboardLayout>
  )
}
