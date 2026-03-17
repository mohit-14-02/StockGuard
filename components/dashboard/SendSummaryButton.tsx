'use client'

import { useState } from 'react'
import { MessageCircle, Loader2, CheckCircle, AlertCircle } from 'lucide-react'

export default function SendSummaryButton() {
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  const handleSend = async () => {
    setStatus('sending')
    setMessage('')

    try {
      const res = await fetch('/api/demo/send-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      const data = await res.json()

      if (data.success) {
        setStatus('success')
        setMessage('Summary sent to WhatsApp! 📱')
      } else {
        setStatus('error')
        setMessage(data.error || 'Failed to send summary')
      }
    } catch (err: any) {
      setStatus('error')
      setMessage(err.message || 'Network error')
    }

    // Reset after 4 seconds
    setTimeout(() => {
      setStatus('idle')
      setMessage('')
    }, 4000)
  }

  return (
    <button
      onClick={handleSend}
      disabled={status === 'sending'}
      className={`
        flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold text-sm
        transition-all shadow-sm active:scale-[0.97] w-full
        ${status === 'success'
          ? 'bg-gradient-to-br from-green-50 to-emerald-50 text-green-700 border border-green-200'
          : status === 'error'
            ? 'bg-gradient-to-br from-red-50 to-rose-50 text-red-700 border border-red-200'
            : 'bg-gradient-to-br from-purple-50 to-violet-50 hover:from-purple-100 hover:to-violet-100 text-purple-700 border border-purple-200'
        }
        disabled:opacity-60 disabled:cursor-not-allowed
      `}
    >
      {status === 'sending' && <Loader2 className="w-5 h-5 animate-spin" />}
      {status === 'success' && <CheckCircle className="w-5 h-5" />}
      {status === 'error' && <AlertCircle className="w-5 h-5" />}
      {status === 'idle' && <MessageCircle className="w-5 h-5" />}

      {status === 'idle' && 'Send WhatsApp Summary'}
      {status === 'sending' && 'Sending...'}
      {status === 'success' && message}
      {status === 'error' && message}
    </button>
  )
}
