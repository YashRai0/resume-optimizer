/**
 * Asynchronously loads the Razorpay checkout.js script if not already present.
 * Returns a promise that resolves to true once window.Razorpay is available,
 * or false if script loading fails (e.g. ad blockers or network disconnects).
 */
let razorpayScriptPromise = null

export function loadRazorpayScript() {
  if (typeof window === 'undefined') {
    return Promise.resolve(false)
  }

  if (typeof window.Razorpay === 'function') {
    return Promise.resolve(true)
  }

  if (razorpayScriptPromise) {
    return razorpayScriptPromise
  }

  razorpayScriptPromise = new Promise((resolve) => {
    const existing = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]')
    if (existing) {
      if (typeof window.Razorpay === 'function') {
        return resolve(true)
      }
      existing.addEventListener('load', () => resolve(typeof window.Razorpay === 'function'), { once: true })
      existing.addEventListener('error', () => {
        razorpayScriptPromise = null
        resolve(false)
      }, { once: true })
      return
    }

    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.async = true
    script.onload = () => {
      resolve(typeof window.Razorpay === 'function')
    }
    script.onerror = () => {
      razorpayScriptPromise = null
      resolve(false)
    }
    document.body.appendChild(script)
  })

  return razorpayScriptPromise
}
