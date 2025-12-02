'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/DashboardLayout'
import { apiClient } from '@/lib/api'
import toast from 'react-hot-toast'

interface Location {
  id: string
  name: string
  address: string
  city: string
  country: string
  status: string
  monitoringEnabled: boolean
  createdAt: string
}

export default function LocationsPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [locations, setLocations] = useState<Location[]>([])
  const [loadingLocations, setLoadingLocations] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  useEffect(() => {
    if (user) {
      fetchLocations()
    }
  }, [user])

  const fetchLocations = async () => {
    try {
      const response = await apiClient.get('/api/locations')
      setLocations(response.data.locations || [])
    } catch (error) {
      toast.error('Failed to load locations')
    } finally {
      setLoadingLocations(false)
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
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Business Locations
            </h1>
            <p className="text-gray-600 dark:text-gray-300">
              Manage locations you're monitoring
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="btn-primary"
          >
            + Add Location
          </button>
        </div>

        {/* Locations Grid */}
        <div className="grid md:grid-cols-2 gap-6">
          {loadingLocations ? (
            <div className="card col-span-2 text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            </div>
          ) : locations.length === 0 ? (
            <div className="card col-span-2 text-center py-12">
              <div className="text-6xl mb-4">📍</div>
              <h3 className="text-xl font-semibold mb-2">No locations yet</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Add your first business location to start monitoring reviews
              </p>
              <button
                onClick={() => setShowAddModal(true)}
                className="btn-primary"
              >
                Add Your First Location
              </button>
            </div>
          ) : (
            locations.map((location) => (
              <div key={location.id} className="card hover:shadow-lg transition-shadow">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                      {location.name}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 text-sm">
                      {location.address}, {location.city}
                    </p>
                    <p className="text-gray-500 dark:text-gray-500 text-sm">
                      {location.country}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    location.monitoringEnabled
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {location.monitoringEnabled ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <div className="flex gap-2">
                  <button className="btn-primary text-sm flex-1">
                    View Details
                  </button>
                  <button className="btn-secondary text-sm">
                    Settings
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Add Location Modal (simplified) */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="card max-w-md w-full">
            <h2 className="text-2xl font-bold mb-4">Add Location</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              This feature is coming soon. You'll be able to add and configure monitoring for your business locations.
            </p>
            <button
              onClick={() => setShowAddModal(false)}
              className="btn-secondary w-full"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
