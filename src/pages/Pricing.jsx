import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { PLAN_POLICY } from '../../shared/planPolicy.js'
import { useAuth } from '../context/AuthContext'
import { apiClient } from '../utils/apiClient'
import { extractErrorMessage } from '../utils/errorMessage'
import { loadRazorpayScript } from '../utils/loadRazorpay'
import toast from 'react-hot-toast'
import { ArrowLeft, Check, ShieldCheck } from 'lucide-react'

const plans = [
  {
    name: PLAN_POLICY.free.label,
    price: 0,
    period: 'forever',
    plan: 'free',
    features: [
      `${PLAN_POLICY.free.quotas.optimizations} optimizations/month`,
      'ATS score checker',
      'Missing keywords',
      `${PLAN_POLICY.free.quotas.bulletRewrites} basic bullet rewrite/month`,
      `Last ${PLAN_POLICY.free.quotas.history} optimization results`
    ],
    cta: 'Get Started Free',
    highlight: false
  },
  {
    name: PLAN_POLICY.monthly.label,
    price: PLAN_POLICY.monthly.amount / 100,
    period: `one-time, ${PLAN_POLICY.monthly.durationDays} days`,
    plan: 'monthly',
    features: [
      `Unlimited optimizations for ${PLAN_POLICY.monthly.durationDays} days`,
      'Cover letter generator',
      'Contextual bullet rewriting',
      'Full optimization history'
    ],
    cta: 'Buy 30-day Pro access',
    highlight: true
  },
  {
    name: PLAN_POLICY.annual.label,
    price: PLAN_POLICY.annual.amount / 100,
    period: `one-time, ${PLAN_POLICY.annual.durationDays} days`,
    plan: 'annual',
    features: [
      `Pro access for ${PLAN_POLICY.annual.durationDays} days`,
      'Unlimited optimizations',
      'Cover letter generator',
      'Contextual bullet rewriting',
      'Full optimization history',
      'One-time payment; no automatic renewal'
    ],
    cta: 'Buy 365-day Pro access',
    highlight: false
  }
]

export default function Pricing() {
  const { user, isAuthenticated: isSignedIn } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(null)

  const handlePayment = async (plan) => {
    if (plan.price === 0) {
      navigate('/dashboard')
      return
    }

    if (!isSignedIn) {
      navigate('/signup')
      return
    }

    setLoading(plan.plan)

    try {
      const scriptReady = await loadRazorpayScript()
      if (!scriptReady || typeof window.Razorpay !== 'function') {
        throw new Error('Payment gateway could not be loaded. Check your connection or ad blocker and try again.')
      }

      const { data: order } = await apiClient.post('/api/create-order', {
        plan: plan.plan
      })

      const razorpayKey = order.keyId || import.meta.env.VITE_RAZORPAY_KEY_ID
      if (!razorpayKey) {
        throw new Error('Payment gateway key is not configured. Please contact support.')
      }

      const options = {
        key: razorpayKey,
        amount: order.amount,
        currency: order.currency || 'INR',
        name: 'ResumeAI4u',
        description: `Pro ${plan.plan === 'annual' ? 'Annual (365 days)' : 'Monthly (30 days)'}`,
        order_id: order.id,
        handler: async (response) => {
          const verifyToast = toast.loading('Verifying payment...')
          try {
            const { data } = await apiClient.post('/api/verify-payment', {
              ...response,
              plan: plan.plan
            })
            if (data.success) {
              toast.success('Payment verified! Your Pro plan is active.', { id: verifyToast })
              navigate('/dashboard')
            } else {
              toast.error(data.message || 'Payment verification was not completed.', { id: verifyToast })
            }
          } catch (err) {
            toast.error(extractErrorMessage(err, 'Payment could not be verified yet. Contact support before paying again.'), { id: verifyToast })
          }
        },
        modal: {
          ondismiss: () => {
            setLoading(null)
            toast('Checkout closed', { icon: 'ℹ️' })
          }
        },
        prefill: {
          name: user?.displayName || '',
          email: user?.email || ''
        },
        theme: { color: '#09090b' }
      }

      const rzp = new window.Razorpay(options)
      rzp.on('payment.failed', (failResponse) => {
        setLoading(null)
        console.error('Razorpay payment failed:', failResponse.error?.code || 'unknown')
        toast.error(failResponse.error?.description || 'Payment was declined or failed. Please try again.')
      })
      rzp.open()
    } catch (err) {
      toast.error(extractErrorMessage(err, 'We could not start checkout. Try again.'))
      console.error('Payment order request failed. HTTP status:', err.response?.status || err.message || 'error')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="min-h-screen bg-stone-50 text-stone-950">
      <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8 sm:py-12">
        <Link to="/" className="inline-flex min-h-10 items-center gap-2 text-sm font-medium text-stone-600 hover:text-stone-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700"><ArrowLeft size={16} /> Back to ResumeAI4u</Link>
        <div className="mx-auto mb-12 mt-12 max-w-2xl text-center sm:mt-16">
          <p className="text-xs font-semibold uppercase tracking-[.14em] text-blue-800">Plans</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight">Straightforward pricing.</h1>
          <p className="mt-4 text-base leading-7 text-stone-600">Start free and upgrade when the extra support is useful. Every paid plan is a one-time purchase.</p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-5">
          {plans.map((plan, i) => (
            <div key={i} className={`flex flex-col rounded-2xl p-6 border sm:p-7 ${plan.highlight ? 'border-stone-950 bg-white shadow-[0_20px_55px_-40px_rgba(0,0,0,.45)]' : 'border-stone-200 bg-white'}`}>
              {plan.highlight && (
                <span className="mb-4 inline-flex w-fit items-center gap-1.5 rounded-full bg-stone-950 px-3 py-1 text-xs font-medium text-white">
                  <ShieldCheck size={13} /> Recommended
                </span>
              )}
              <h2 className="text-xl font-semibold">{plan.name}</h2>
              <div className="mb-6">
                <span className="text-4xl font-semibold tracking-tight">
                  {plan.price === 0 ? 'Free' : `₹${plan.price}`}
                </span>
                {plan.price > 0 && (
                  <span className="text-stone-600 text-sm ml-2">{plan.period}</span>
                )}
              </div>
              <ul className="mb-8 flex-1 space-y-3 border-t border-stone-200 pt-5">
                {plan.features.map((feat, j) => (
                  <li key={j} className="flex items-start gap-2.5 text-stone-700 text-sm leading-5">
                    <Check size={16} className="mt-0.5 shrink-0 text-blue-800" aria-hidden="true" /> {feat}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => handlePayment(plan)}
                disabled={loading === plan.plan}
                className={`min-h-11 w-full rounded-lg px-4 py-2.5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60 ${plan.highlight ? 'bg-stone-950 hover:bg-stone-800 text-white' : 'border border-stone-300 bg-white hover:border-stone-500 text-stone-950'}`}
              >
                {loading === plan.plan ? 'Opening secure checkout…' : plan.cta}
              </button>
            </div>
          ))}
        </div>

        <p className="mx-auto mt-7 max-w-2xl text-center text-stone-600 text-sm leading-6">
          One-time payments via Razorpay. Pro access ends after the displayed term; it does not renew automatically.
        </p>
      </div>
    </div>
  )
}
