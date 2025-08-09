// app/settings/page.tsx
"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import Link from "next/link"

interface FamilyMember {
  name: string
  relationship: string
  age?: number
}

interface Settings {
  // Calendar
  selectedCalendars: string[]
  
  // Location
  homeCity: string
  homeState: string
  homeCountry: string
  workAddress: string
  
  // Family
  familyMembers: FamilyMember[]
  
  // Timing preferences
  bookFlightsDaysAhead: number
  bookSitterDaysAhead: number
  bookHotelsDaysAhead: number
  
  // Sitter rules
  defaultSitterNeeded: boolean
  sitterStartTime: number
  sitterExceptions: string[]
  
  // Travel
  drivingRadiusMiles: number
  preferredAirports: string[]
  
  // AI Context
  customContext: string
}

export default function SettingsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [settings, setSettings] = useState<Partial<Settings>>({
    familyMembers: [],
    sitterExceptions: [],
    preferredAirports: [],
    bookFlightsDaysAhead: 60,
    bookSitterDaysAhead: 14,
    bookHotelsDaysAhead: 30,
    drivingRadiusMiles: 50,
    sitterStartTime: 18,
    defaultSitterNeeded: true,
  })
  const [calendars, setCalendars] = useState<Array<{
    id: string;
    summary: string;
    backgroundColor?: string;
    primary?: boolean;
  }>>([])
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'household' | 'calendars' | 'timing' | 'ai'>('household')

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
    } else if (session) {
      fetchSettings()
      fetchCalendars()
    }
  }, [status, session, router])

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/settings')
      if (response.ok) {
        const data = await response.json()
        setSettings(data.settings || {})
      }
    } catch (err) {
      console.error('Error fetching settings:', err)
    }
  }

  const fetchCalendars = async () => {
    try {
      const response = await fetch('/api/calendar/list')
      if (response.ok) {
        const data = await response.json()
        setCalendars(data.calendars || [])
      }
    } catch (err) {
      console.error('Error fetching calendars:', err)
    }
  }

  const saveSettings = async () => {
    setSaving(true)
    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings })
      })
      
      if (response.ok) {
        console.log('✅ Settings saved')
      }
    } catch (err) {
      console.error('Error saving settings:', err)
    } finally {
      setSaving(false)
    }
  }

  const addFamilyMember = () => {
    setSettings(prev => ({
      ...prev,
      familyMembers: [...(prev.familyMembers || []), { name: '', relationship: '' }]
    }))
  }

  const updateFamilyMember = (index: number, field: keyof FamilyMember, value: string | number) => {
    setSettings(prev => {
      const members = [...(prev.familyMembers || [])]
      members[index] = { ...members[index], [field]: value }
      return { ...prev, familyMembers: members }
    })
  }

  const removeFamilyMember = (index: number) => {
    setSettings(prev => ({
      ...prev,
      familyMembers: prev.familyMembers?.filter((_, i) => i !== index) || []
    }))
  }

  if (!session) return null

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Settings</h1>
            <p className="text-gray-600">Configure your personal assistant</p>
          </div>
          <Link
            href="/"
            className="px-4 py-2 text-sm bg-gray-200 hover:bg-gray-300 rounded-lg transition"
          >
            ← Back to Dashboard
          </Link>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 mb-6 bg-gray-200 p-1 rounded-lg">
          {[
            { id: 'household', label: '🏠 Household', icon: '🏠' },
            { id: 'calendars', label: '📅 Calendars', icon: '📅' },
            { id: 'timing', label: '⏰ Timing', icon: '⏰' },
            { id: 'ai', label: '🤖 AI Context', icon: '🤖' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as 'household' | 'calendars' | 'timing' | 'ai')}
              className={`flex-1 px-4 py-2 rounded-md transition ${
                activeTab === tab.id
                  ? 'bg-white shadow'
                  : 'hover:bg-gray-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-lg shadow p-6">
          {activeTab === 'household' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold mb-4">Location</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Home City</label>
                    <input
                      type="text"
                      value={settings.homeCity || ''}
                      onChange={(e) => setSettings(prev => ({ ...prev, homeCity: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-lg"
                      placeholder="e.g., San Francisco"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">State</label>
                    <input
                      type="text"
                      value={settings.homeState || ''}
                      onChange={(e) => setSettings(prev => ({ ...prev, homeState: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-lg"
                      placeholder="e.g., CA"
                    />
                  </div>
                </div>
              </div>

              <div>
                <h2 className="text-xl font-semibold mb-4">Family Members</h2>
                <div className="space-y-2">
                  {settings.familyMembers?.map((member, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="text"
                        value={member.name}
                        onChange={(e) => updateFamilyMember(index, 'name', e.target.value)}
                        className="flex-1 px-3 py-2 border rounded-lg"
                        placeholder="Name"
                      />
                      <input
                        type="text"
                        value={member.relationship}
                        onChange={(e) => updateFamilyMember(index, 'relationship', e.target.value)}
                        className="flex-1 px-3 py-2 border rounded-lg"
                        placeholder="Relationship (daughter, son, partner)"
                      />
                      <input
                        type="number"
                        value={member.age || ''}
                        onChange={(e) => updateFamilyMember(index, 'age', parseInt(e.target.value))}
                        className="w-20 px-3 py-2 border rounded-lg"
                        placeholder="Age"
                      />
                      <button
                        onClick={() => removeFamilyMember(index)}
                        className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={addFamilyMember}
                    className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200"
                  >
                    + Add Family Member
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'calendars' && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold mb-4">Calendars to Monitor</h2>
              <p className="text-sm text-gray-600 mb-4">
                Select which calendars the AI should analyze for tasks and preparations
              </p>
              {calendars.map(calendar => (
                <label
                  key={calendar.id}
                  className="flex items-center space-x-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={settings.selectedCalendars?.includes(calendar.id) || false}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSettings(prev => ({
                          ...prev,
                          selectedCalendars: [...(prev.selectedCalendars || []), calendar.id]
                        }))
                      } else {
                        setSettings(prev => ({
                          ...prev,
                          selectedCalendars: prev.selectedCalendars?.filter(id => id !== calendar.id) || []
                        }))
                      }
                    }}
                    className="rounded"
                  />
                  <div className="flex items-center space-x-2 flex-1">
                    {calendar.backgroundColor && (
                      <div
                        className="w-4 h-4 rounded"
                        style={{ backgroundColor: calendar.backgroundColor }}
                      />
                    )}
                    <span>{calendar.summary}</span>
                    {calendar.primary && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                        Primary
                      </span>
                    )}
                  </div>
                </label>
              ))}
            </div>
          )}

          {activeTab === 'timing' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold mb-4">Booking Lead Times</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Book flights _ days in advance
                    </label>
                    <input
                      type="number"
                      value={settings.bookFlightsDaysAhead || 60}
                      onChange={(e) => setSettings(prev => ({ 
                        ...prev, 
                        bookFlightsDaysAhead: parseInt(e.target.value) 
                      }))}
                      className="w-32 px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Book babysitter _ days in advance
                    </label>
                    <input
                      type="number"
                      value={settings.bookSitterDaysAhead || 14}
                      onChange={(e) => setSettings(prev => ({ 
                        ...prev, 
                        bookSitterDaysAhead: parseInt(e.target.value) 
                      }))}
                      className="w-32 px-3 py-2 border rounded-lg"
                    />
                  </div>
                </div>
              </div>

              <div>
                <h2 className="text-xl font-semibold mb-4">Babysitter Rules</h2>
                <div className="space-y-4">
                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={settings.defaultSitterNeeded}
                      onChange={(e) => setSettings(prev => ({ 
                        ...prev, 
                        defaultSitterNeeded: e.target.checked 
                      }))}
                      className="rounded"
                    />
                    <span>Assume babysitter needed for evening events</span>
                  </label>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      After what time? (24hr)
                    </label>
                    <input
                      type="number"
                      value={settings.sitterStartTime || 18}
                      onChange={(e) => setSettings(prev => ({ 
                        ...prev, 
                        sitterStartTime: parseInt(e.target.value) 
                      }))}
                      className="w-32 px-3 py-2 border rounded-lg"
                      min="0"
                      max="23"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'ai' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold mb-4">Additional Context for AI</h2>
                <p className="text-sm text-gray-600 mb-4">
                  Add any additional context that helps the AI understand your schedule better
                </p>
                <textarea
                  value={settings.customContext || ''}
                  onChange={(e) => setSettings(prev => ({ ...prev, customContext: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg h-32"
                  placeholder="e.g., I work from home on Mondays and Fridays. My mom lives in Winchester. Book club is always family-friendly. I prefer aisle seats on flights."
                />
              </div>

              <div>
                <h2 className="text-xl font-semibold mb-4">Travel Preferences</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Driving radius (miles) - beyond this, suggest flights
                    </label>
                    <input
                      type="number"
                      value={settings.drivingRadiusMiles || 50}
                      onChange={(e) => setSettings(prev => ({ 
                        ...prev, 
                        drivingRadiusMiles: parseInt(e.target.value) 
                      }))}
                      className="w-32 px-3 py-2 border rounded-lg"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Save Button */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={saveSettings}
            disabled={saving}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  )
}