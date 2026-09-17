import { motion, AnimatePresence } from 'framer-motion'
import { AlertCircle, Clock, ArrowRight, X } from 'lucide-react'

interface PaymentNoticeModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  amount?: number
  isProcessing?: boolean
}

export function PaymentNoticeModal({ isOpen, onClose, onConfirm, amount, isProcessing }: PaymentNoticeModalProps) {
  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        background: 'rgba(13, 16, 96, 0.82)',
        backdropFilter: 'blur(8px)'
      }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          style={{
            background: '#ffffff',
            borderRadius: '8px',
            maxWidth: '460px',
            width: '100%',
            overflow: 'hidden',
            boxShadow: '0 24px 64px rgba(0,0,0,0.35)',
            border: '1px solid rgba(0,0,0,0.1)',
            position: 'relative'
          }}
        >
          {/* Header */}
          <div style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid #f1f5f9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#f8fafc'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                background: 'rgba(192, 39, 45, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--color-nets-red, #c0272d)',
                flexShrink: 0
              }}>
                <Clock size={20} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.0625rem', fontWeight: 700, color: 'var(--color-nets-navy-dark, #0d1060)' }}>
                  Payment Notice
                </h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-nets-text-3, #64748b)' }}>
                  Paystack Secure Payment Gateway
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={isProcessing}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: isProcessing ? 'not-allowed' : 'pointer',
                color: '#94a3b8',
                padding: '4px',
                display: 'flex',
                alignItems: 'center'
              }}
              title="Close"
            >
              <X size={20} />
            </button>
          </div>

          {/* Body */}
          <div style={{ padding: '1.5rem' }}>
            {/* Prominent Bank Transfer Expiry Alert */}
            <div style={{
              background: '#fffbeb',
              border: '1.5px solid #fde68a',
              borderRadius: '6px',
              padding: '1.125rem',
              display: 'flex',
              gap: '0.875rem',
              alignItems: 'flex-start',
              marginBottom: '1.25rem'
            }}>
              <AlertCircle size={22} color="#d97706" style={{ flexShrink: 0, marginTop: 2 }} />
              <div style={{ fontSize: '0.875rem', color: '#92400e', lineHeight: 1.5 }}>
                <strong style={{ display: 'block', fontSize: '0.9375rem', marginBottom: '0.35rem', color: '#78350f' }}>
                  Note: For bank transfers, account generated will expire within 30m
                </strong>
                If you choose to pay via <strong>Bank Transfer</strong> on the Paystack checkout screen, the dedicated virtual bank account number provided will automatically expire after <strong>30 minutes</strong>.
              </div>
            </div>

            <p style={{ fontSize: '0.8125rem', color: 'var(--color-nets-text-2, #475569)', lineHeight: 1.5, margin: 0 }}>
              Please ensure your transfer is completed before the timer elapses. If paying with Debit Card or USSD, payment confirmation is processed instantaneously.
            </p>

            {amount && amount > 0 ? (
              <div style={{
                marginTop: '1.25rem',
                padding: '0.875rem 1rem',
                background: '#f8fafc',
                borderRadius: '6px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                border: '1px solid #e2e8f0'
              }}>
                <span style={{ fontSize: '0.8125rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Payable</span>
                <span style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-nets-navy-dark, #0d1060)' }}>
                  ₦{Math.round(amount).toLocaleString('en-NG')}
                </span>
              </div>
            ) : null}
          </div>

          {/* Footer */}
          <div style={{
            padding: '1rem 1.5rem',
            borderTop: '1px solid #f1f5f9',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '0.75rem',
            background: '#fafafa'
          }}>
            <button
              type="button"
              onClick={onClose}
              disabled={isProcessing}
              className="btn btn-outline"
              style={{
                padding: '0.625rem 1.25rem',
                fontSize: '0.875rem',
                background: '#fff',
                borderColor: '#cbd5e1',
                color: '#475569'
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isProcessing}
              className="btn btn-red"
              style={{
                padding: '0.625rem 1.5rem',
                fontSize: '0.875rem',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                border: 'none'
              }}
            >
              <span>{isProcessing ? 'Opening Checkout...' : 'Proceed to Payment'}</span>
              <ArrowRight size={15} />
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
