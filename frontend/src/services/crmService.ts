// ============================================================================
// NETS Enterprise Lead Management — Direct Database API Client
// ============================================================================

import { API_URL } from '../config/api'

export interface CRMSubmissionResponse {
  success: boolean
  leadId?: string
  error?: string
}

class CRMService {
  /**
   * Submit a new lead/booking directly to the remote PostgreSQL database.
   */
  public async submitLead(payload: any): Promise<CRMSubmissionResponse> {
    const leadRef = payload.leadMetadata?.quoteReferenceNumber || `NETS-LD-${Date.now().toString().slice(-6)}`

    try {
      const response = await fetch(`${API_URL}/leads`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        const json = await response.json()
        const leadData = json.data?.lead || json.data
        return {
          success: true,
          leadId: leadData?.leadId || leadData?.leadReference || leadRef,
        }
      } else {
        const errorJson = await response.json().catch(() => ({}))
        console.error('⚠️ [CRM SERVICE] Backend error:', errorJson)
        return { success: false, error: errorJson.error || 'Failed to submit lead' }
      }
    } catch (err) {
      console.error('⚠️ [CRM SERVICE] Network error reaching backend API:', err)
      return { success: false, error: 'Network error reaching backend API' }
    }
  }

  /**
   * Fire an analytics event for business intelligence.
   */
  public trackEvent(eventName: string, eventData: any): void {
    console.log(`📊 [ANALYTICS] ${eventName}`, eventData)
  }
}

export const crmService = new CRMService()
