// ============================================================================
// NETS Admin — Dedicated Distance Calculator Page
// ============================================================================
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Calculator, MapPin, Navigation, Info, Users, ArrowRight, ShieldCheck, Truck, Fuel } from 'lucide-react'
import { DistanceCalculatorWidget } from '../components/DistanceCalculatorWidget'

export function DistanceCalculatorPage() {
  const navigate = useNavigate()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Page Header */}
      <div className="admin-page-header">
        <div>
          <div className="admin-page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <Calculator size={22} color="var(--adm-accent)" /> Distance & Route Intelligence Calculator
          </div>
          <div className="admin-page-desc">
            Accurate Nigerian highway transit mileage, travel duration, depot repositioning, and charter quotes for sales closers and transport managers.
          </div>
        </div>
        <div className="admin-page-actions" style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            type="button"
            className="admin-btn admin-btn-ghost admin-btn-sm"
            onClick={() => navigate('/admin/crm')}
          >
            <Users size={13} /> View CRM Pipeline
          </button>
        </div>
      </div>

      {/* Main Distance Calculator Tool */}
      <DistanceCalculatorWidget
        compact={false}
        showMapDefault={true}
        title="Interactive Nigerian Distance & Logistics Engine"
        subtitle="Lookup driving mileage between any airports, cities, hotels, or custom addresses with live Google Directions & Nigerian road network tortuosity calibration"
      />

      {/* Operational Guidelines & Commercial Protocol Reference */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '1rem',
        }}
      >
        <div className="admin-card" style={{ padding: '1.25rem', background: 'var(--adm-surface)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.625rem' }}>
            <Truck size={16} color="var(--adm-accent)" />
            <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--adm-text-1)' }}>
              Depot Repositioning Rules
            </span>
          </div>
          <p style={{ fontSize: 12, color: 'var(--adm-text-2)', lineHeight: 1.6, margin: 0 }}>
            NETS vehicles dispatch from the primary Central Depot at <strong>Festac Town, Lagos</strong>.
            Repositioning kilometers from the depot to client pickup are automatically calculated and factored into commercial quotations to ensure operational fuel and driver mobilization are covered.
          </p>
        </div>

        <div className="admin-card" style={{ padding: '1.25rem', background: 'var(--adm-surface)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.625rem' }}>
            <Navigation size={16} color="#0284c7" />
            <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--adm-text-1)' }}>
              Nigerian Highway Tortuosity (1.35×)
            </span>
          </div>
          <p style={{ fontSize: 12, color: 'var(--adm-text-2)', lineHeight: 1.6, margin: 0 }}>
            In areas where live turn-by-turn routing encounters network interruptions, NETS applies a calibrated <strong>1.35× road network tortuosity factor</strong> over straight-line Haversine distances to maintain reliable transit quotes that reflect true road travel.
          </p>
        </div>

        <div className="admin-card" style={{ padding: '1.25rem', background: 'var(--adm-surface)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.625rem' }}>
            <ShieldCheck size={16} color="#16A34A" />
            <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--adm-text-1)' }}>
              Interstate Safety & Rest Stops
            </span>
          </div>
          <p style={{ fontSize: 12, color: 'var(--adm-text-2)', lineHeight: 1.6, margin: 0 }}>
            Trips exceeding 300 km or 5 hours travel time are classified as Interstate Corridors.
            These routes require mandatory 20-minute driver rest stops every 3.5 hours, and journeys over 8 hours utilize dual-chauffeur rotation protocols.
          </p>
        </div>
      </div>
    </div>
  )
}
