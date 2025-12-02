'use client'

import { useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/DashboardLayout'

export default function ResponsesPage() {
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
            AI Response Generator
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Generate and manage AI-powered responses to reviews
          </p>
        </div>

        <div className="card text-center py-12">
          <div className="text-6xl mb-4">✍️</div>
          <h3 className="text-xl font-semibold mb-2">AI Response Generator</h3>
          <p className="text-gray-600 dark:text-gray-400">
            Select a mention from the Mentions page to generate AI-powered responses
          </p>
        </div>
      </div>
    </DashboardLayout>
  )
}
