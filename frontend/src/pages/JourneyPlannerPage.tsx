import { useEffect } from 'react'
import { useJourneyStore } from '../store/useJourneyStore'
import { PlannerLayout } from '../components/planner/PlannerLayout'
import { Step1Locations } from '../components/planner/new_steps/Step1Locations'
import { Step2Details } from '../components/planner/new_steps/Step2Details'
import { Step3Review } from '../components/planner/new_steps/Step3Review'
import { Step10Success } from '../components/planner/steps/Step10Success'
import { AnimatePresence, motion } from 'framer-motion'
import { usePaystackPayment } from 'react-paystack'
import { PAYSTACK_PUBLIC_KEY, API_URL } from '../config/api'
import { crmService } from '../services/crmService'
import { emailService } from '../services/emailService'

export function JourneyPlannerPage() {
  const state = useJourneyStore()
  const { currentStep, nextStep, prevStep } = state

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
    
    // Trigger lead capture modal on load if not already filled
    if (!state.customerDetails.email && !state.isLeadModalOpen) {
      state.setLeadModalNextAction('planner')
      state.setLeadModalOpen(true)
    }
  }, [currentStep])

  useEffect(() => {
    const fetchSettings = async () => {
      let pixelId = ''
      try {
        const res = await fetch(`${API_URL}/settings`)
        if (res.ok) {
          const json = await res.json()
          pixelId = json.data?.metaPixelId || ''
        }
      } catch (e) {}

      if (pixelId) {
        ;(function(f: any, b: any, e: any, v: any, n?: any, t?: any, s?: any) {
          if (f.fbq) return;
          n = f.fbq = function() {
            n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments)
          };
          if (!f._fbq) f._fbq = n;
          n.push = n;
          n.loaded = !0;
          n.version = '2.0';
          n.queue = [];
          t = b.createElement(e);
          t.async = !0;
          t.src = v;
          s = b.getElementsByTagName(e)[0];
          s.parentNode.insertBefore(t, s);
        })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
        
        ;(window as any).fbq('init', pixelId);
        ;(window as any).fbq('track', 'PageView');
      }
    }
    fetchSettings()
  }, [])

  const isStep1Complete = Boolean(
    state.pickup &&
    state.destination &&
    (!state.stops || state.stops.length === 0 || state.stops.every(s => s && s.address && s.address.trim() !== ''))
  )
  const isStep2Complete = state.passengers && state.travelDate && state.departureTime && state.selectedVehicleId && state.additionalVehicleIds.every(id => id !== '') && (state.tripType === 'Recurring' ? state.multiDayItinerary.every(d => d.date) : true)

  const isComplete = currentStep === 1 ? isStep1Complete : currentStep === 2 ? isStep2Complete : true

  const paystackConfig = {
    reference: new Date().getTime().toString(),
    email: state.customerDetails?.email || 'customer@nets.com.ng',
    amount: (state.estimatedInvestment?.estimatedInvestment || 0) * 100, // Amount is in Kobo
    publicKey: PAYSTACK_PUBLIC_KEY,
  }

  const handleSuccess = async (reference: any) => {
    console.log('Payment successful:', reference)
    const payRef = reference?.reference || reference?.trxref || paystackConfig.reference

    if (!state.referenceNumber) {
      state.generateReference()
    }

    const payload = state.getCRMLeadPayload()
    payload.paymentInformation = {
      status: 'paid',
      paymentMethod: 'Paystack',
      paystackReference: payRef,
      amountPaid: state.estimatedInvestment?.estimatedInvestment || 0,
      paidAt: new Date().toISOString()
    }
    if (payload.leadMetadata) {
      payload.leadMetadata.status = 'Paid & Confirmed'
      payload.leadMetadata.paymentReference = payRef
    }

    try {
      await Promise.all([
        crmService.submitLead(payload),
        emailService.sendNewBookingNotification(payload),
        emailService.sendConfirmationEmail(payload),
      ])
    } catch (err) {
      console.warn('Backend submission / email notification failed, proceeding to confirmation screen:', err)
    }

    crmService.trackEvent('Payment_Completed', { reference: payRef, amount: paystackConfig.amount })
    
    // Fire Meta Pixel Purchase event
    if ((window as any).fbq) {
      ;(window as any).fbq('track', 'Purchase', {
        value: paystackConfig.amount / 100,
        currency: 'NGN',
        content_name: 'Vehicle Booking',
      })
    }
    
    // Set current step to 4 (Step10Success) and scroll to top of page
    state.setStep(4)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleClose = () => {
    console.log('Payment modal closed by user')
  }

  const initializePayment = usePaystackPayment(paystackConfig)

  const handlePay = () => {
    if (!state.estimatedInvestment?.estimatedInvestment) {
      alert('Cannot process payment: estimated investment is missing.')
      return
    }

    if (!paystackConfig.publicKey) {
      alert('Paystack public key is not configured. Please set VITE_PAYSTACK_PUBLIC_KEY in environment.')
      return
    }

    // Fire Meta Pixel InitiateCheckout event
    if ((window as any).fbq) {
      ;(window as any).fbq('track', 'InitiateCheckout')
    }

    initializePayment({
      ...paystackConfig,
      onSuccess: handleSuccess,
      onClose: handleClose,
    } as any)
  }

  const renderStep = () => {
    switch (currentStep) {
      case 1: return <Step1Locations />
      case 2: return <Step2Details />
      case 3: return <Step3Review />
      case 4: return <Step10Success />
      default: return <Step1Locations />
    }
  }

  return (
    <>
      <PlannerLayout>
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
          >
            {renderStep()}
          </motion.div>
        </AnimatePresence>
      </PlannerLayout>

      {/* Floating Action Buttons */}
      {currentStep < 4 && (
        <div style={{ 
          position: 'fixed',
          bottom: '2rem',
          left: '2rem',
          right: '2rem',
          background: 'transparent',
          display: 'flex', 
          justifyContent: currentStep === 1 ? 'flex-end' : 'space-between',
          pointerEvents: 'none', // so users can click map through the empty space
          zIndex: 9999
        }}>
          {currentStep > 1 && (
            <button
              onClick={prevStep}
              className="btn btn-outline shadow-lg"
              style={{ padding: '0.75rem 2rem', border: '1px solid var(--color-nets-border)', background: '#fff', pointerEvents: 'auto', boxShadow: '0 8px 16px rgba(0,0,0,0.1)', marginLeft: '1rem' }}
            >
              Back
            </button>
          )}

          <button
            onClick={currentStep === 3 ? handlePay : nextStep}
            disabled={!isComplete}
            className="btn btn-red btn-lg shadow-lg"
            style={{ 
              padding: '0.75rem 3rem', 
              opacity: isComplete ? 1 : 0.5, 
              cursor: isComplete ? 'pointer' : 'not-allowed', 
              border: 'none', 
              pointerEvents: 'auto', 
              boxShadow: '0 8px 16px rgba(192,39,45,0.2)' 
            }}
          >
            {currentStep === 1 ? 'Next Step' : currentStep === 2 ? 'Review & Pay' : 'Pay Now'}
          </button>
        </div>
      )}
    </>
  )
}
