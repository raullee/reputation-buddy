'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/DashboardLayout'
import toast from 'react-hot-toast'

export default function SettingsPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('profile')

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
            Settings
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Manage your account and preferences
          </p>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex gap-8">
            {['profile', 'billing', 'notifications', 'integrations'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-4 px-1 border-b-2 font-medium transition-colors ${
                  activeTab === tab
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </nav>
        </div>

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="card">
            <h2 className="text-xl font-bold mb-6">Profile Information</h2>
            <div className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">First Name</label>
                  <input
                    type="text"
                    defaultValue={user.firstName}
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Last Name</label>
                  <input
                    type="text"
                    defaultValue={user.lastName}
                    className="input"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Email</label>
                <input
                  type="email"
                  defaultValue={user.email}
                  className="input"
                  disabled
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Business Name</label>
                <input
                  type="text"
                  defaultValue={user.businessName}
                  className="input"
                />
              </div>
              <button className="btn-primary">
                Save Changes
              </button>
            </div>
          </div>
        )}

        {/* Billing Tab */}
        {activeTab === 'billing' && (
          <div className="space-y-6">
            <div className="card">
              <h2 className="text-xl font-bold mb-4">Current Plan</h2>
              <div className="flex justify-between items-center">
                <div>
                  <div className="text-2xl font-bold">{user.plan} Plan</div>
                  <p className="text-gray-600 dark:text-gray-400">
                    Manage your subscription and billing
                  </p>
                </div>
                <button className="btn-primary">
                  Upgrade Plan
                </button>
              </div>
            </div>

            <div className="card">
              <h2 className="text-xl font-bold mb-4">Billing History</h2>
              <p className="text-gray-600 dark:text-gray-400">
                No billing history available yet
              </p>
            </div>
          </div>
        )}

        {/* Notifications Tab */}
        {activeTab === 'notifications' && (
          <div className="card">
            <h2 className="text-xl font-bold mb-6">Notification Preferences</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold">WhatsApp Alerts</div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Get instant alerts for critical reviews
                  </p>
                </div>
                <input type="checkbox" className="w-5 h-5" defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold">Email Notifications</div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Daily summary of activity
                  </p>
                </div>
                <input type="checkbox" className="w-5 h-5" defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold">SMS Alerts</div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Emergency notifications only
                  </p>
                </div>
                <input type="checkbox" className="w-5 h-5" />
              </div>
              <button className="btn-primary">
                Save Preferences
              </button>
            </div>
          </div>
        )}

        {/* Integrations Tab */}
        {activeTab === 'integrations' && (
          <div className="space-y-6">
            <div className="card">
              <h2 className="text-xl font-bold mb-4">Connected Integrations</h2>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">📱</div>
                    <div>
                      <div className="font-semibold">WhatsApp</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Connected</div>
                    </div>
                  </div>
                  <button className="text-red-600 text-sm font-semibold">Disconnect</button>
                </div>
                <div className="flex justify-between items-center p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">💳</div>
                    <div>
                      <div className="font-semibold">Stripe</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Connected</div>
                    </div>
                  </div>
                  <button className="text-red-600 text-sm font-semibold">Disconnect</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
