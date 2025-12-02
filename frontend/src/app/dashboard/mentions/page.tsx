'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/DashboardLayout'
import { apiClient } from '@/lib/api'
import toast from 'react-hot-toast'

interface Mention {
  id: string
  platform: string
  author: string
  content: string
  rating?: number
  sentiment: number
  riskLevel: string
  createdAt: string
  status: string
}

export default function MentionsPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [mentions, setMentions] = useState<Mention[]>([])
  const [loadingMentions, setLoadingMentions] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  useEffect(() => {
    if (user) {
      fetchMentions()
    }
  }, [user, filter])

  const fetchMentions = async () => {
    try {
      const response = await apiClient.get('/api/mentions', {
        params: { status: filter !== 'all' ? filter : undefined }
      })
      setMentions(response.data.mentions || [])
    } catch (error) {
      toast.error('Failed to load mentions')
    } finally {
      setLoadingMentions(false)
    }
  }

  const getSentimentColor = (sentiment: number) => {
    if (sentiment > 0.6) return 'text-green-600'
    if (sentiment > 0.4) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getSentimentEmoji = (sentiment: number) => {
    if (sentiment > 0.6) return '😊'
    if (sentiment > 0.4) return '😐'
    return '😟'
  }

  const getRiskBadge = (risk: string) => {
    const colors = {
      high: 'bg-red-100 text-red-800',
      medium: 'bg-yellow-100 text-yellow-800',
      low: 'bg-green-100 text-green-800',
    }
    return colors[risk as keyof typeof colors] || colors.low
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
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Mentions & Reviews
            </h1>
            <p className="text-gray-600 dark:text-gray-300">
              Monitor and respond to reviews across all platforms
            </p>
          </div>
          <button className="btn-primary">
            Refresh
          </button>
        </div>

        {/* Filters */}
        <div className="flex gap-2">
          {['all', 'new', 'pending', 'responded'].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === status
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>

        {/* Mentions List */}
        <div className="space-y-4">
          {loadingMentions ? (
            <div className="card text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            </div>
          ) : mentions.length === 0 ? (
            <div className="card text-center py-12">
              <div className="text-6xl mb-4">🔍</div>
              <h3 className="text-xl font-semibold mb-2">No mentions yet</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Add locations to start monitoring reviews and mentions
              </p>
            </div>
          ) : (
            mentions.map((mention) => (
              <div key={mention.id} className="card hover:shadow-lg transition-shadow">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="text-3xl">{getSentimentEmoji(mention.sentiment)}</div>
                    <div>
                      <div className="font-semibold text-gray-900 dark:text-white">
                        {mention.author}
                      </div>
                      <div className="text-sm text-gray-500">
                        {mention.platform} • {new Date(mention.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {mention.rating && (
                      <div className="text-yellow-500 font-semibold">
                        ⭐ {mention.rating}/5
                      </div>
                    )}
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getRiskBadge(mention.riskLevel)}`}>
                      {mention.riskLevel.toUpperCase()}
                    </span>
                  </div>
                </div>

                <p className="text-gray-700 dark:text-gray-300 mb-4">
                  {mention.content}
                </p>

                <div className="flex gap-2">
                  <button className="btn-primary text-sm">
                    Generate Response
                  </button>
                  <button className="btn-secondary text-sm">
                    View Details
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
