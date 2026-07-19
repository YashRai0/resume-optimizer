import { useState } from 'react'
import { useUser } from '@clerk/clerk-react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

const plans = [
  {
    name: 'Free',
    price: 0,
    period: 'forever',
    plan: 'free',
    features: [
      '3 optimizations/month',
      'ATS score checker',
      'Missing keywords',
      'Basic bullet rewrite'
    ],
    cta: 'Get Started Free',
    highlight: false
  },
  {
    name: 'Pro',
    price: 299,
    period: 'per month',
    plan: 'monthly',
    features: [
      'Unlimited optimizations',
      'Cover letter generator',
      'Version history',
      'Naukri optimization',
      'Priority support'
    ],
    cta: 'Get Pro — ₹299/mo',
    highlight: true
  },
  {
    name: 'Pro Annual',
    price: 199,
    period: 'per month · billed ₹2,388/yr',
    plan: 'annual',
    features: [
      'Everything in Pro',
      'LinkedIn optimizer',
      'Interview prep questions',
      'Skill gap analysis',
      '2 months free'
    ],
    cta: 'Get Annual — ₹199/mo',
    highlight: false
  }
]

export default function Pricing() {
  const { user, isSignedIn } = useUser()
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
      const { data: order } = await axios.post('http://localhost:5000/api/create-order', {
        plan: plan.plan
      })

      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: order.amount,
        currency: 'INR',
        name: 'ResumeAI',
        description: `Pro ${plan.plan === 'annual' ? 'Annual' : 'Monthly'} Plan`,
        order_id: order.id,
        handler: async (response) => {
          try {
            const { data } = await axios.post('http://localhost:5000/api/verify-payment', response)
            if (data.success) {
              await user.update({ publicMetadata: { plan: 'pro' } })
              alert('Payment successful! You are now Pro 🎉')
              navigate('/dashboard')
            }
          } catch (err) {
            alert('Payment verification failed')
          }
        },
        prefill: {
          name: user?.fullName || '',
          email: user?.primaryEmailAddress?.emailAddress || ''
        },
        theme: { color: '#2563eb' }
      }

      const rzp = new window.Razorpay(options)
      rzp.open()
    } catch (err) {
      alert('Something went wrong. Try again.')
      console.error(err)
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-5xl mx-auto px-4 py-20">
        <div className="text-center mb-14">
          <h1 className="text-4xl font-bold mb-4">Simple, honest pricing</h1>
          <p className="text-gray-400 text-lg">Start free. Upgrade when you're ready.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {plans.map((plan, i) => (
            <div key={i} className={`rounded-2xl p-8 border ${plan.highlight ? 'border-blue-500 bg-blue-600/10' : 'border-gray-800 bg-gray-900'}`}>
              {plan.highlight && (
                <span className="bg-blue-500 text-white text-xs px-3 py-1 rounded-full mb-4 inline-block">
                  Most Popular
                </span>
              )}
              <h3 className="text-xl font-bold mb-1">{plan.name}</h3>
              <div className="mb-6">
                <span className="text-4xl font-bold">
                  {plan.price === 0 ? 'Free' : `₹${plan.price}`}
                </span>
                {plan.price > 0 && (
                  <span className="text-gray-400 text-sm ml-2">{plan.period}</span>
                )}
              </div>
              <ul className="space-y-3 mb-8">
                {plan.features.map((feat, j) => (
                  <li key={j} className="flex items-center gap-2 text-gray-300 text-sm">
                    <span className="text-green-400">✓</span> {feat}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => handlePayment(plan)}
                disabled={loading === plan.plan}
                className={`w-full py-3 rounded-xl font-semibold transition ${plan.highlight ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'border border-gray-700 hover:border-gray-500 text-white'}`}
              >
                {loading === plan.plan ? 'Processing...' : plan.cta}
              </button>
            </div>
          ))}
        </div>

        <p className="text-center text-gray-600 text-sm mt-8">
          All prices include GST · Cancel anytime · Secure payments via Razorpay
        </p>
      </div>
    </div>
  )
}