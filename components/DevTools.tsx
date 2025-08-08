// components/DevTools.tsx
"use client"

import { useState } from 'react'

interface DevToolsProps {
  onFlushCache: () => Promise<void>
  onReanalyze: (skipCache: boolean) => Promise<void>
  isAnalyzing: boolean
}

export function DevTools({ onFlushCache, onReanalyze, isAnalyzing }: DevToolsProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [showConfirmFlush, setShowConfirmFlush] = useState(false)
  const [skipCache, setSkipCache] = useState(false)

  const handleFlush = async () => {
    if (!showConfirmFlush) {
      setShowConfirmFlush(true)
      return
    }
    
    await onFlushCache()
    setShowConfirmFlush(false)
  }

  // Only show in development
  if (process.env.NODE_ENV !== 'development') {
    return null
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {!isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          className="bg-purple-600 text-white p-3 rounded-full shadow-lg hover:bg-purple-700 transition"
          title="Developer Tools"
        >
          🛠️
        </button>
      ) : (
        <div className="bg-white rounded-lg shadow-xl p-4 w-80 border-2 border-purple-600">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-purple-600">Dev Tools</h3>
            <button
              onClick={() => setIsOpen(false)}
              className="text-black hover:text-gray-700"
            >
              ✕
            </button>
          </div>

          <div className="space-y-3">
            {/* Skip Cache Toggle */}
            <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
              <label className="text-sm font-medium">Skip Cache</label>
              <input
                type="checkbox"
                checked={skipCache}
                onChange={(e) => setSkipCache(e.target.checked)}
                className="rounded"
              />
            </div>

            {/* Re-analyze Button */}
            <button
              onClick={() => onReanalyze(skipCache)}
              disabled={isAnalyzing}
              className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400 transition"
            >
              {isAnalyzing ? '🔄 Analyzing...' : '🤖 Re-analyze Events'}
              {skipCache && ' (Fresh)'}
            </button>

            {/* Flush Cache Button */}
            <button
              onClick={handleFlush}
              className={`w-full px-4 py-2 rounded transition ${
                showConfirmFlush 
                  ? 'bg-red-600 text-white hover:bg-red-700' 
                  : 'bg-yellow-500 text-white hover:bg-yellow-600'
              }`}
            >
              {showConfirmFlush ? '⚠️ Click again to confirm' : '🗑️ Flush Analysis Cache'}
            </button>
            {showConfirmFlush && (
              <p className="text-xs text-red-600">
                This will delete all analyzed events and tasks!
              </p>
            )}

            {/* View Last Analysis */}
            <details className="border rounded p-2">
              <summary className="cursor-pointer text-sm font-medium">
                📊 Last Analysis Details
              </summary>
              <div className="mt-2 text-xs space-y-1">
                <p>Check console for full analysis logs</p>
                <p className="font-mono bg-gray-100 p-1 rounded">
                  localStorage.getItem('lastAnalysis')
                </p>
              </div>
            </details>

            {/* Test Events */}
            <details className="border rounded p-2">
              <summary className="cursor-pointer text-sm font-medium">
                🧪 Add Test Event
              </summary>
              <div className="mt-2 space-y-2">
                <button
                  onClick={() => {
                    // You can expand this to actually create test events
                    console.log('Test event buttons - implement as needed')
                  }}
                  className="w-full text-xs px-2 py-1 bg-gray-100 rounded hover:bg-gray-200"
                >
                  Add "Dinner Party" (needs sitter)
                </button>
                <button className="w-full text-xs px-2 py-1 bg-gray-100 rounded hover:bg-gray-200">
                  Add "Flight to NYC" (needs booking)
                </button>
                <button className="w-full text-xs px-2 py-1 bg-gray-100 rounded hover:bg-gray-200">
                  Add "Doctor Appointment"
                </button>
              </div>
            </details>
          </div>

          <div className="mt-4 pt-3 border-t text-xs text-black">
            💡 Tip: Check browser console for detailed logs
          </div>
        </div>
      )}
    </div>
  )
}