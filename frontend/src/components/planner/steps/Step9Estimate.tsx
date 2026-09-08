import { motion } from 'framer-motion'
import { ArrowRight, Check, ShieldCheck } from 'lucide-react'
import { useJourneyStore } from '../../../store/useJourneyStore'
import { vehicles } from '../../../data/vehicles'
import { fadeUp, staggerContainer } from '../../../lib/motion'
import { useState } from 'react'
import { crmService } from '../../../services/crmService'
import { emailService } from '../../../services/emailService'

export function Step9Estimate() {
  const state = useJourneyStore()
  const vehicle = vehicles.find(v => v.id === (state.selectedVehicleId || state.recommendedVehicleId))
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Use real pricing engine output — single Estimated Investment
  const formattedEstimate = state.customerPricingView?.estimatedInvestment ?? 'Calculating...'

  const handleChange = (field: string, value: string | boolean) => {
    state.setCustomerDetails({ [field]: value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      state.generateReference()
      const payload = state.getCRMLeadPayload()
      
      // Send to mock enterprise CRM
      const crmResponse = await crmService.submitLead(payload)

      if (crmResponse.success) {
        // Trigger automated email workflows concurrently
        await Promise.all([
          emailService.sendConfirmationEmail(payload),
          emailService.sendInternalNotification(payload)
        ])
        
        state.nextStep()
      } else {
        alert('There was an issue processing your request. Please try again.')
      }
    } catch (error) {
      console.error('Submission error:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const details = state.customerDetails
  const isValid = details.fullName && details.email && details.phone && details.consentGiven && details.heardAboutUs

  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="visible" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      
      <div style={{ flex: 1 }}>
        <motion.h2 variants={fadeUp} style={{ fontSize: '2rem', fontWeight: 300, color: 'var(--color-nets-navy-dark)', marginBottom: '0.5rem', lineHeight: 1.2 }}>
          Your Journey Estimate is Ready
        </motion.h2>
        <motion.p variants={fadeUp} style={{ fontSize: '1rem', color: 'var(--color-nets-text-2)', marginBottom: '2.5rem' }}>
          We've prepared an estimated investment based on your journey requirements.
        </motion.p>

        <motion.div variants={fadeUp} style={{ background: 'var(--color-nets-navy-dark)', color: '#fff', padding: '2rem', marginBottom: '3rem', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, right: 0, opacity: 0.05, transform: 'translate(20%, -20%)' }}>
            <ShieldCheck size={200} />
          </div>
          
          <div style={{ fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--color-nets-red)', marginBottom: '1rem' }}>
            Estimated Investment
          </div>
          
          <div style={{ fontSize: '2.5rem', fontWeight: 300, letterSpacing: '0.02em', marginBottom: '2rem' }}>
            {formattedEstimate}
          </div>

          <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1.5rem', marginBottom: '1.5rem' }}>
            <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}>
              This estimate is based on:
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.875rem', color: '#fff' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Check size={14} color="var(--color-nets-red)" /> Route Distance</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Check size={14} color="var(--color-nets-red)" /> Vehicle Category</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Check size={14} color="var(--color-nets-red)" /> Passenger Count</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Check size={14} color="var(--color-nets-red)" /> Journey Type</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Check size={14} color="var(--color-nets-red)" /> Fuel Requirements</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Check size={14} color="var(--color-nets-red)" /> Professional Driver</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Check size={14} color="var(--color-nets-red)" /> Company Operational Standards</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Check size={14} color="var(--color-nets-red)" /> Safety Standards</div>
            </div>
          </div>

          <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>
            This is an estimated investment based on your selected journey details. Your final quotation may vary if additional services or special operational requirements are requested.
          </div>
        </motion.div>

        <motion.div variants={fadeUp} style={{ marginBottom: '2.5rem' }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--color-nets-navy-dark)', marginBottom: '1rem' }}>
            To receive your personalised quotation we'll send you:
          </h3>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2rem' }}>
            {['Detailed Pricing', 'Vehicle Recommendation', 'Journey Summary PDF', 'Booking Reference', 'Transport Specialist Contact'].map((item, i) => (
              <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.9375rem', color: 'var(--color-nets-text-2)' }}>
                <div style={{ background: 'var(--color-nets-light)', borderRadius: '50%', padding: '0.25rem' }}>
                  <Check size={12} color="var(--color-nets-navy-dark)" />
                </div>
                {item}
              </li>
            ))}
          </ul>
          <p style={{ fontSize: '0.9375rem', color: 'var(--color-nets-text)', fontWeight: 500 }}>
            Please tell us where you'd like us to send it.
          </p>
        </motion.div>

        <motion.form variants={fadeUp} onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-nets-text-2)' }}>Full Name *</label>
              <input type="text" required value={details.fullName} onChange={e => handleChange('fullName', e.target.value)}
                style={{ width: '100%', padding: '0.875rem 1rem', fontSize: '0.9375rem', border: '1px solid var(--color-nets-border)', outline: 'none' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-nets-text-2)' }}>Email Address *</label>
              <input type="email" required value={details.email} onChange={e => handleChange('email', e.target.value)}
                style={{ width: '100%', padding: '0.875rem 1rem', fontSize: '0.9375rem', border: '1px solid var(--color-nets-border)', outline: 'none' }} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-nets-text-2)' }}>Phone Number *</label>
              <input type="tel" required value={details.phone} onChange={e => handleChange('phone', e.target.value)}
                style={{ width: '100%', padding: '0.875rem 1rem', fontSize: '0.9375rem', border: '1px solid var(--color-nets-border)', outline: 'none' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-nets-text-2)' }}>WhatsApp Number <span style={{ color: 'var(--color-nets-text-3)', fontWeight: 400, textTransform: 'none', letterSpacing: 'normal' }}>(Optional)</span></label>
              <input type="tel" value={details.whatsappNumber} onChange={e => handleChange('whatsappNumber', e.target.value)}
                style={{ width: '100%', padding: '0.875rem 1rem', fontSize: '0.9375rem', border: '1px solid var(--color-nets-border)', outline: 'none' }} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-nets-text-2)' }}>Company <span style={{ color: 'var(--color-nets-text-3)', fontWeight: 400, textTransform: 'none', letterSpacing: 'normal' }}>(Optional)</span></label>
              <input type="text" value={details.company} onChange={e => handleChange('company', e.target.value)}
                style={{ width: '100%', padding: '0.875rem 1rem', fontSize: '0.9375rem', border: '1px solid var(--color-nets-border)', outline: 'none' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-nets-text-2)' }}>Where did you hear about us? *</label>
              <select 
                required
                value={details.heardAboutUs}
                onChange={e => handleChange('heardAboutUs', e.target.value)}
                style={{ width: '100%', padding: '0.875rem 1rem', fontSize: '0.9375rem', border: '1px solid var(--color-nets-border)', outline: 'none', backgroundColor: '#fff' }}
              >
                <option value="" disabled>Select an option</option>
                <option value="Google Search">Google Search</option>
                <option value="Social Media">Social Media</option>
                <option value="Friend/Colleague">Friend or Colleague</option>
                <option value="Advertisement">Advertisement</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-nets-text-2)' }}>Special Instructions <span style={{ color: 'var(--color-nets-text-3)', fontWeight: 400, textTransform: 'none', letterSpacing: 'normal' }}>(Optional)</span></label>
            <textarea rows={1} value={details.specialInstructions} onChange={e => handleChange('specialInstructions', e.target.value)}
              style={{ width: '100%', padding: '0.875rem 1rem', fontSize: '0.9375rem', border: '1px solid var(--color-nets-border)', outline: 'none', resize: 'vertical' }} />
          </div>

          <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', marginTop: '0.5rem', cursor: 'pointer' }}>
            <input type="checkbox" required checked={details.consentGiven} onChange={e => handleChange('consentGiven', e.target.checked)} style={{ marginTop: '0.25rem' }} />
            <span style={{ fontSize: '0.8125rem', color: 'var(--color-nets-text-2)', lineHeight: 1.5 }}>
              I agree to the <a href="/terms" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-nets-navy-dark)', textDecoration: 'underline' }}>Terms of Service</a> and <a href="/privacy" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-nets-navy-dark)', textDecoration: 'underline' }}>Privacy Policy</a>, and consent to being contacted regarding this quotation.
            </span>
          </label>

          {/* Trust Indicators */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginTop: '2rem', padding: '1rem', background: 'var(--color-nets-light)', borderLeft: '3px solid var(--color-nets-navy-dark)' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-nets-navy-dark)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ShieldCheck size={14} color="var(--color-nets-red)" /> No payment required
            </div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-nets-navy-dark)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ShieldCheck size={14} color="var(--color-nets-red)" /> Response within 2 business hours
            </div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-nets-navy-dark)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ShieldCheck size={14} color="var(--color-nets-red)" /> Trusted across Nigeria
            </div>
          </div>

          <motion.div variants={fadeUp} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '2rem', paddingTop: '2rem', borderTop: '1px solid var(--color-nets-border)' }}>
            <button
              type="button"
              onClick={state.prevStep}
              style={{ background: 'transparent', border: 'none', fontSize: '0.9375rem', fontWeight: 600, color: 'var(--color-nets-text-2)', cursor: 'pointer' }}
            >
              Back
            </button>
            <button
              type="submit"
              disabled={!isValid || isSubmitting}
              className="btn btn-navy"
              style={{ opacity: isValid && !isSubmitting ? 1 : 0.5, pointerEvents: isValid && !isSubmitting ? 'auto' : 'none', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              {isSubmitting ? 'Preparing Quote...' : 'Receive My Personalised Quote'} {isSubmitting ? null : <ArrowRight size={16} />}
            </button>
          </motion.div>

        </motion.form>
      </div>

    </motion.div>
  )
}
