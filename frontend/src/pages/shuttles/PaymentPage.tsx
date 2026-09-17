import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { CreditCard, Wallet, ShieldCheck, ArrowLeft, CheckCircle2 } from 'lucide-react'
import { useShuttleStore } from '../../store/useShuttleStore'
import { PAYSTACK_PUBLIC_KEY } from '../../config/api'
import { emailService } from '../../services/emailService'
import { PaymentNoticeModal } from '../../components/payment/PaymentNoticeModal'

export function PaymentPage() {
  const navigate = useNavigate()
  const { 
    selectedRoute, pickupStop, dropoffStop, selectedTrip,
    seatCount, promoDiscountRatio,
    paymentMethod, setPaymentMethod, walletBalance,
    confirmBooking, customPassengerEmail, savedPassengers, selectedPassengerId 
  } = useShuttleStore()

  const [isProcessing, setIsProcessing] = useState(false)
  const [paystackLoaded, setPaystackLoaded] = useState(false)
  const [showPaymentNotice, setShowPaymentNotice] = useState(false)

  // Dynamically load Paystack Inline JS script
  useEffect(() => {
    if ((window as any).PaystackPop) {
      setPaystackLoaded(true)
      return
    }
    const script = document.createElement('script')
    script.src = 'https://js.paystack.co/v1/inline.js'
    script.async = true
    script.onload = () => setPaystackLoaded(true)
    document.body.appendChild(script)
  }, [])

  if (!selectedRoute || !pickupStop || !dropoffStop || !selectedTrip) {
    return (
      <div style={{ paddingTop: '100px', textAlign: 'center', minHeight: '80vh', padding: '4rem 1rem' }}>
        <h2>Incomplete Booking Selection</h2>
        <Link to="/shuttles" className="btn btn-red" style={{ marginTop: '1rem' }}>Start Over</Link>
      </div>
    )
  }

  const baseTotal = selectedTrip.farePerSeat * seatCount
  const discountAmt = Math.round(baseTotal * promoDiscountRatio)
  const finalTotal = baseTotal - discountAmt

  const getPassengerEmail = () => {
    if (selectedPassengerId === 'custom') return customPassengerEmail || 'passenger@nets.ng'
    const pax = savedPassengers.find(p => p.id === selectedPassengerId)
    return pax?.email || 'passenger@nets.ng'
  }

  const executePaystack = () => {
    setShowPaymentNotice(false)
    setIsProcessing(true)
    const email = getPassengerEmail()

    if ((window as any).PaystackPop) {
      try {
        const handler = (window as any).PaystackPop.setup({
          key: PAYSTACK_PUBLIC_KEY,
          email,
          amount: finalTotal * 100, // Amount in kobo
          currency: 'NGN',
          ref: `NETS-SHUTTLE-${Date.now()}`,
          metadata: {
            custom_fields: [
              { display_name: 'Route', variable_name: 'route', value: selectedRoute.name },
              { display_name: 'Seats', variable_name: 'seats', value: seatCount }
            ]
          },
          callback: (response: any) => {
            console.log('Paystack Payment Success:', response)
            const newBooking = confirmBooking()
            emailService.sendNewBookingNotification(newBooking)
            setIsProcessing(false)
            navigate(`/shuttles/confirmation/${newBooking.id}`)
          },
          onClose: () => {
            setIsProcessing(false)
          }
        })
        handler.openIframe()
        return
      } catch (err) {
        console.warn('Paystack popup error:', err)
        alert('Could not initialize Paystack payment modal. Please try again.')
        setIsProcessing(false)
        return
      }
    } else {
      alert('Paystack is still loading. Please wait a moment and try again.')
      setIsProcessing(false)
    }
  }

  const handleConfirmPay = () => {
    if (paymentMethod === 'wallet') {
      if (walletBalance < finalTotal) {
        alert('Insufficient wallet balance. Please top-up or select Paystack card payment.')
        return
      }
      setIsProcessing(true)
      setTimeout(() => {
        const newBooking = confirmBooking()
        emailService.sendNewBookingNotification(newBooking)
        setIsProcessing(false)
        navigate(`/shuttles/confirmation/${newBooking.id}`)
      }, 800)
      return
    }

    // Paystack Payment Option
    setShowPaymentNotice(true)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      
      {/* Header Banner - Full Bleed Navy Dark */}
      <section style={{ background: 'var(--color-nets-navy-dark)', color: '#fff', paddingTop: '7.5rem', paddingBottom: '3rem', borderBottom: '4px solid var(--color-nets-red)' }}>
        <div className="container-nets">
          <Link to="/shuttles/details" style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.875rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
            <ArrowLeft size={14} />
            <span>Back to Trip Details</span>
          </Link>
          <div className="overline-dark" style={{ marginTop: '0.75rem', marginBottom: '0.25rem' }}>
            Step 5 • Payment & Confirmation
          </div>
          <h1 style={{ fontSize: 'clamp(1.75rem, 3vw, 2.25rem)', fontWeight: 800 }}>
            Payment Method
          </h1>
        </div>
      </section>

      {/* Main Content */}
      <main className="container-nets" style={{ padding: '2.5rem 0 5rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '2.5rem', alignItems: 'flex-start' }}>
          
          {/* Left Column — Payment Options */}
          <div className="col-span-12 lg:col-span-7" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            <div style={{ background: '#fff', padding: '2rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-nets-navy)', marginBottom: '1.5rem' }}>
                Select How You Want to Pay
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                
                {/* 1. Paystack Gateway (Recommended) */}
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '1.25rem',
                  borderRadius: '8px',
                  border: paymentMethod === 'paystack' ? '2px solid var(--color-nets-red)' : '1px solid #e2e8f0',
                  background: paymentMethod === 'paystack' ? 'rgba(192, 39, 45, 0.03)' : '#fff',
                  cursor: 'pointer'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <input
                      type="radio"
                      name="paymentOption"
                      value="paystack"
                      checked={paymentMethod === 'paystack'}
                      onChange={() => setPaymentMethod('paystack')}
                    />
                    <div>
                      <div style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <CreditCard size={18} color="var(--color-nets-navy)" />
                        <span>Paystack Instant Checkout (Cards, USSD, Bank Transfer)</span>
                      </div>
                      <div style={{ fontSize: '0.8125rem', color: '#64748b', marginTop: '2px' }}>
                        Pay directly using Visa, Mastercard, Verve, USSD or Bank Transfer
                      </div>
                    </div>
                  </div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0284c7', background: '#e0f2fe', padding: '0.2rem 0.6rem', borderRadius: '4px' }}>
                    Paystack
                  </span>
                </label>

                {/* 2. NETS Wallet */}
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '1.25rem',
                  borderRadius: '8px',
                  border: paymentMethod === 'wallet' ? '2px solid var(--color-nets-navy)' : '1px solid #e2e8f0',
                  background: paymentMethod === 'wallet' ? 'rgba(13, 16, 96, 0.03)' : '#fff',
                  cursor: 'pointer'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <input
                      type="radio"
                      name="paymentOption"
                      value="wallet"
                      checked={paymentMethod === 'wallet'}
                      onChange={() => setPaymentMethod('wallet')}
                    />
                    <div>
                      <div style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Wallet size={18} color="var(--color-nets-navy)" />
                        <span>NETS Digital Wallet</span>
                      </div>
                      <div style={{ fontSize: '0.8125rem', color: '#64748b', marginTop: '2px' }}>
                        Instant 1-click checkout from pre-loaded funds
                      </div>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Balance</span>
                    <div style={{ fontSize: '1.125rem', fontWeight: 800, color: walletBalance >= finalTotal ? '#10b981' : '#ef4444' }}>
                      ₦{walletBalance.toLocaleString()}
                    </div>
                  </div>
                </label>

                {/* 3. Saved Cards */}
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '1.25rem',
                  borderRadius: '8px',
                  border: paymentMethod === 'card' ? '2px solid var(--color-nets-navy)' : '1px solid #e2e8f0',
                  background: paymentMethod === 'card' ? 'rgba(13, 16, 96, 0.03)' : '#fff',
                  cursor: 'pointer'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <input
                      type="radio"
                      name="paymentOption"
                      value="card"
                      checked={paymentMethod === 'card'}
                      onChange={() => setPaymentMethod('card')}
                    />
                    <div>
                      <div style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <CreditCard size={18} color="var(--color-nets-navy)" />
                        <span>Saved Mastercard (Ending in •••• 4821)</span>
                      </div>
                      <div style={{ fontSize: '0.8125rem', color: '#64748b', marginTop: '2px' }}>
                        Expires 09/28 • Paystack tokenized charge
                      </div>
                    </div>
                  </div>
                </label>

              </div>
            </div>

            {/* Security Guarantee Box */}
            <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <ShieldCheck size={24} color="#10b981" />
              <div style={{ fontSize: '0.8125rem', color: '#475569', lineHeight: 1.4 }}>
                <strong>100% Secure Paystack Guarantee:</strong> All transactions are processed using PCI-DSS Level 1 certified encryption. Boarding passes and QR codes are generated instantly.
              </div>
            </div>

          </div>

          {/* Right Column — Final Order Review & Submit */}
          <div className="col-span-12 lg:col-span-5">
            <div style={{ background: '#fff', padding: '2rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--color-nets-navy)', marginBottom: '1.25rem' }}>
                Final Booking Review
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem', fontSize: '0.875rem', color: '#334155' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Route</span>
                  <span style={{ fontWeight: 600 }}>{selectedRoute.name}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Pickup Stop</span>
                  <span style={{ fontWeight: 600 }}>{pickupStop.name}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Drop-off Stop</span>
                  <span style={{ fontWeight: 600 }}>{dropoffStop.name}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Departure Time</span>
                  <span style={{ fontWeight: 700, color: 'var(--color-nets-red)' }}>{selectedTrip.departureTime}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Seats</span>
                  <span style={{ fontWeight: 600 }}>{seatCount} Seat(s)</span>
                </div>
              </div>

              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '1.25rem', marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>Total Amount</span>
                <span style={{ fontSize: '1.625rem', fontWeight: 800, color: 'var(--color-nets-navy)' }}>
                  ₦{finalTotal.toLocaleString()}
                </span>
              </div>

              {/* Terms Acceptance Disclaimer */}
              <div style={{ background: '#f8fafc', padding: '0.75rem 1rem', borderRadius: '6px', border: '1px solid #e2e8f0', marginBottom: '1rem', fontSize: '0.75rem', color: '#64748b', lineHeight: 1.5, textAlign: 'center' }}>
                By proceeding to payment, you confirm your seat reservation and agree to our{' '}
                <Link
                  to="/terms"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: 'var(--color-nets-navy)', fontWeight: 700, textDecoration: 'underline' }}
                >
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link
                  to="/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: 'var(--color-nets-navy)', fontWeight: 700, textDecoration: 'underline' }}
                >
                  Privacy Policy
                </Link>.
              </div>

              <button
                onClick={handleConfirmPay}
                disabled={isProcessing}
                className="btn btn-red btn-lg"
                style={{ width: '100%', justifyContent: 'center', border: 'none', cursor: isProcessing ? 'not-allowed' : 'pointer' }}
              >
                {isProcessing ? 'Connecting to Paystack...' : `Confirm & Pay ₦${finalTotal.toLocaleString()}`}
              </button>
            </div>
          </div>

        </div>
      </main>

      <PaymentNoticeModal
        isOpen={showPaymentNotice}
        onClose={() => setShowPaymentNotice(false)}
        onConfirm={executePaystack}
        amount={finalTotal}
        isProcessing={isProcessing}
      />
    </div>
  )
}
