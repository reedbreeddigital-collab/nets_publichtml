import { API_URL } from '../../config/api'

export interface AdminStats {
  totalQuotes: number
  pendingLeads: number
  unreadContacts: number
  activeFleet: number
  totalPipelineValue: number
}

export interface AdminLead {
  id: number | string
  leadReference: string
  customerName: string
  customerEmail: string
  customerPhone?: string
  company?: string
  heardAboutUs?: string
  journeyType?: string
  origin?: string
  destination?: string
  estimatedInvestmentMin?: number
  estimatedInvestmentMax?: number
  status: string
  crmStatus: string
  assignedTo?: string
  notes?: string
  createdAt: string
  payload?: any
}

export interface AdminBookingDB {
  id: string
  reference: string
  quoteReference?: string
  customerId?: string
  customerName: string
  vehicleId?: string
  vehicleName: string
  driverId?: string
  driverName?: string
  pickup: string
  destination: string
  distanceKm: number
  durationMins: number
  tripType: string
  passengerCount: number
  travelDate: string
  totalAmount: number
  paymentStatus: 'pending' | 'partial' | 'paid' | 'invoiced' | 'overdue'
  operationalStatus: 'pending' | 'confirmed' | 'dispatched' | 'completed' | 'cancelled'
  notes?: string
  createdAt: string
}

export interface AdminCustomerDB {
  id: string
  fullName: string
  email: string
  phone?: string
  company?: string
  type: 'corporate' | 'individual'
  totalBookings: number
  totalSpend: number
  notes?: string
  createdAt: string
}

export interface AdminUserDB {
  id: string
  fullName: string
  email: string
  role: string
  status: 'active' | 'inactive'
  lastLogin?: string
  createdAt: string
}

export class AdminService {
  /**
   * Fetch live dashboard statistics from Go REST API backend or local store.
   */
  public async getStats(): Promise<AdminStats> {
    try {
      const res = await fetch(`${API_URL}/admin/stats`)
      if (res.ok) {
        const json = await res.json()
        if (json.data) return json.data
      }
    } catch (err) {
      console.warn('⚠️ [ADMIN SERVICE] Could not fetch stats from backend:', err)
    }

    const leads = await this.getLeads()
    const validLeads = leads.filter(l => String(l.crmStatus || l.status).toLowerCase() !== 'invalid')
    const pendingLeads = validLeads.filter(l => {
      const isWon =
        String(l.crmStatus).toLowerCase() === 'won & paid' ||
        String(l.crmStatus).toLowerCase() === 'won' ||
        String(l.crmStatus).toLowerCase() === 'converted' ||
        ['converted', 'won', 'paid'].includes(String(l.status).toLowerCase())
      return !isWon && (l.crmStatus === 'New Lead' || l.crmStatus === 'Pending Review' || l.status === 'new' || l.status === 'pending')
    }).length
    const totalPipelineValue = validLeads.reduce((acc, l) => acc + (l.estimatedInvestmentMax || l.estimatedInvestmentMin || 0), 0)

    return {
      totalQuotes: validLeads.length,
      pendingLeads,
      unreadContacts: 0,
      activeFleet: 5,
      totalPipelineValue,
    }
  }

  /**
   * Fetch all leads/quotes directly from the remote MySQL database.
   */
  public async getLeads(): Promise<AdminLead[]> {
    let remoteLeads: AdminLead[] = []
    try {
      const res = await fetch(`${API_URL}/leads`, { cache: 'no-store' })
      if (res.ok) {
        const json = await res.json()
        if (json.data && Array.isArray(json.data.leads)) {
          remoteLeads = json.data.leads
        }
      }
    } catch (err) {
      console.error('⚠️ [ADMIN SERVICE] Could not fetch leads from backend:', err)
    }

    const parsePayload = (p: any) => {
      if (!p) return null
      if (typeof p === 'object') return p
      try {
        return JSON.parse(p)
      } catch {
        return null
      }
    }

    // Normalize all database leads to guarantee safe rendering
    return remoteLeads.map((l: any, idx) => ({
      id: l.id || `lead-${idx}`,
      leadReference: l.leadReference || `NETS-LEAD-${String(l.id || idx).padStart(4, '0')}`,
      customerName: l.customerName || 'Valued Customer',
      customerEmail: l.customerEmail || 'N/A',
      customerPhone: l.customerPhone || 'N/A',
      company: l.company || '',
      heardAboutUs: l.heardAboutUs || '',
      journeyType: l.journeyType || 'Standard Charter',
      origin: l.origin || 'Lagos, Nigeria',
      destination: l.destination || 'Lagos, Nigeria',
      estimatedInvestmentMin: Number(l.estimatedInvestmentMin) || 0,
      estimatedInvestmentMax: Number(l.estimatedInvestmentMax) || Number(l.estimatedInvestmentMin) || 0,
      status: l.status || 'pending',
      crmStatus: l.crmStatus || 'New Lead',
      assignedTo: l.assignedTo || '',
      notes: l.notes || '',
      createdAt: l.createdAt || new Date().toISOString(),
      payload: parsePayload(l.payload || l.payloadJSON),
    }))
  }

  /**
   * Fetch a single lead/quote by ID or reference.
   */
  public async getLead(idOrRef: string): Promise<AdminLead | null> {
    try {
      const res = await fetch(`${API_URL}/leads/${encodeURIComponent(idOrRef)}`, { cache: 'no-store' })
      if (res.ok) {
        const json = await res.json()
        if (json.data && json.data.lead) {
          const l = json.data.lead
          const parsePayload = (p: any) => {
            if (!p) return null
            if (typeof p === 'object') return p
            try {
              return JSON.parse(p)
            } catch {
              return null
            }
          }
          return {
            id: l.id,
            leadReference: l.leadReference,
            customerName: l.customerName || 'Valued Customer',
            customerEmail: l.customerEmail || 'N/A',
            customerPhone: l.customerPhone || 'N/A',
            company: l.company || '',
            heardAboutUs: l.heardAboutUs || '',
            journeyType: l.journeyType || 'Standard Charter',
            origin: l.origin || 'Lagos, Nigeria',
            destination: l.destination || 'Lagos, Nigeria',
            estimatedInvestmentMin: Number(l.estimatedInvestmentMin) || 0,
            estimatedInvestmentMax: Number(l.estimatedInvestmentMax) || Number(l.estimatedInvestmentMin) || 0,
            status: l.status || 'pending',
            crmStatus: l.crmStatus || 'New Lead',
            assignedTo: l.assignedTo || '',
            notes: l.notes || '',
            createdAt: l.createdAt || new Date().toISOString(),
            payload: parsePayload(l.payload || l.payloadJSON),
          }
        }
      }
    } catch (err) {
      console.error('⚠️ [ADMIN SERVICE] Could not fetch lead by id/ref:', err)
    }
    return null
  }

  /**
   * Create a new lead directly in remote backend database.
   */
  public async createLead(payload: any): Promise<boolean> {
    try {
      const res = await fetch(`${API_URL}/leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      return res.ok
    } catch (err) {
      console.error('⚠️ [ADMIN SERVICE] Error creating lead:', err)
      return false
    }
  }

  /**
   * Update lead status directly in remote backend database.
   */
  public async updateLeadStatus(id: number | string, status: string): Promise<boolean> {
    try {
      const res = await fetch(`${API_URL}/leads/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      return res.ok
    } catch (err) {
      console.error('⚠️ [ADMIN SERVICE] Error updating lead status:', err)
      return false
    }
  }

  /**
   * Update CRM pipeline status directly in remote backend database.
   */
  public async updateCrmStatus(id: number | string, crmStatus: string): Promise<boolean> {
    try {
      const res = await fetch(`${API_URL}/leads/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ crmStatus }),
      })
      return res.ok
    } catch (err) {
      console.error('⚠️ [ADMIN SERVICE] Error updating CRM status:', err)
      return false
    }
  }

  /**
   * Update lead notes directly in remote backend database.
   */
  public async updateLeadNotes(id: number | string, notes: string): Promise<boolean> {
    try {
      const res = await fetch(`${API_URL}/leads/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),
      })
      return res.ok
    } catch (err) {
      console.error('⚠️ [ADMIN SERVICE] Error updating lead notes:', err)
      return false
    }
  }

  /**
   * Update lead assignment directly in remote backend database.
   */
  public async updateLeadAssignment(id: number | string, assignedTo: string): Promise<boolean> {
    try {
      const res = await fetch(`${API_URL}/leads/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignedTo }),
      })
      return res.ok
    } catch (err) {
      console.error('⚠️ [ADMIN SERVICE] Error updating lead assignment:', err)
      return false
    }
  }

  /**
   * Delete a lead/quote.
   */
  public async deleteLead(id: number | string): Promise<boolean> {
    try {
      const res = await fetch(`${API_URL}/leads/${id}`, {
        method: 'DELETE',
      })
      return res.ok
    } catch (err) {
      console.error('⚠️ [ADMIN SERVICE] Error deleting lead:', err)
      return false
    }
  }

  /**
   * Fetch all bookings directly from remote backend database.
   */
  public async getBookings(): Promise<AdminBookingDB[]> {
    try {
      const res = await fetch(`${API_URL}/bookings`, { cache: 'no-store' })
      if (res.ok) {
        const json = await res.json()
        if (json.data && Array.isArray(json.data.bookings)) {
          return json.data.bookings
        }
      }
    } catch (err) {
      console.error('⚠️ [ADMIN SERVICE] Could not fetch bookings from backend:', err)
    }
    return []
  }

  /**
   * Update booking operational/payment status directly in backend.
   */
  public async updateBooking(id: string, updates: Partial<AdminBookingDB>): Promise<boolean> {
    try {
      const res = await fetch(`${API_URL}/bookings/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      return res.ok
    } catch (err) {
      console.error('⚠️ [ADMIN SERVICE] Error updating booking:', err)
      return false
    }
  }

  /**
   * Fetch all customers.
   */
  public async getCustomers(): Promise<AdminCustomerDB[]> {
    try {
      const res = await fetch(`${API_URL}/customers`)
      if (res.ok) {
        const json = await res.json()
        if (json.data && Array.isArray(json.data.customers)) {
          return json.data.customers
        }
      }
    } catch (err) {
      console.warn('⚠️ [ADMIN SERVICE] Could not fetch customers from backend:', err)
    }
    
    // Fallback: derive customers from leads and bookings
    const bookings = await this.getBookings()
    const leads = await this.getLeads()
    const customerMap = new Map<string, AdminCustomerDB>()

    bookings.forEach(b => {
      if (!customerMap.has(b.customerName)) {
        customerMap.set(b.customerName, {
          id: b.customerId || `cust-${b.id}`,
          fullName: b.customerName,
          email: `${b.customerName.toLowerCase().replace(/\s+/g, '')}@gmail.com`,
          type: 'individual',
          totalBookings: 1,
          totalSpend: b.totalAmount,
          createdAt: b.createdAt,
        })
      } else {
        const existing = customerMap.get(b.customerName)!
        existing.totalBookings += 1
        existing.totalSpend += b.totalAmount
      }
    })

    leads.forEach(l => {
      if (!customerMap.has(l.customerName)) {
        customerMap.set(l.customerName, {
          id: `cust-${l.id}`,
          fullName: l.customerName,
          email: l.customerEmail,
          phone: l.customerPhone,
          company: l.company,
          type: l.company ? 'corporate' : 'individual',
          totalBookings: 0,
          totalSpend: l.estimatedInvestmentMax || l.estimatedInvestmentMin || 0,
          createdAt: l.createdAt,
        })
      }
    })

    return Array.from(customerMap.values())
  }

  /**
   * Fetch all admin users.
   */
  public async getUsers(): Promise<AdminUserDB[]> {
    try {
      const res = await fetch(`${API_URL}/users`)
      if (res.ok) {
        const json = await res.json()
        if (json.data && Array.isArray(json.data.users)) {
          return json.data.users
        }
      }
    } catch (err) {
      console.warn('⚠️ [ADMIN SERVICE] Could not fetch users from backend:', err)
    }
    return []
  }

  /**
   * Create a new admin user in backend.
   */
  public async saveUser(user: Partial<AdminUserDB>): Promise<boolean> {
    try {
      const res = await fetch(`${API_URL}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(user),
      })
      return res.ok
    } catch (err) {
      return false
    }
  }

  /**
   * Update user status (active/inactive).
   */
  public async updateUserStatus(id: string, status: 'active' | 'inactive'): Promise<boolean> {
    try {
      const res = await fetch(`${API_URL}/users/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      return res.ok
    } catch (err) {
      return false
    }
  }

  /**
   * Update full user data.
   */
  public async updateUser(id: string, updates: Partial<AdminUserDB>): Promise<boolean> {
    try {
      const res = await fetch(`${API_URL}/users/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      return res.ok
    } catch (err) {
      return false
    }
  }

  /**
   * Delete an admin user.
   */
  public async deleteUser(id: string): Promise<boolean> {
    try {
      const res = await fetch(`${API_URL}/users/${id}`, { method: 'DELETE' })
      return res.ok
    } catch (err) {
      return true
    }
  }

  /**
   * Delete vehicle from backend.
   */
  public async deleteVehicle(id: string): Promise<boolean> {
    try {
      const res = await fetch(`${API_URL}/vehicles/${id}`, { method: 'DELETE' })
      return res.ok
    } catch (err) {
      return true
    }
  }

  /**
   * Save (create or update) vehicle in backend.
   */
  public async saveVehicle(vehicleData: any, isEdit: boolean): Promise<boolean> {
    try {
      const url = isEdit ? `${API_URL}/vehicles/${vehicleData.id}` : `${API_URL}/vehicles`
      const method = isEdit ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(vehicleData),
      })
      return res.ok
    } catch (err) {
      return true
    }
  }

  /**
   * Fetch system settings
   */
  public async getSettings(): Promise<any> {
    try {
      const res = await fetch(`${API_URL}/settings`)
      if (!res.ok) return null
      return await res.json()
    } catch (err) {
      console.error(err)
      return null
    }
  }

  /**
   * Update system settings
   */
  public async updateSettings(settings: any): Promise<boolean> {
    try {
      const res = await fetch(`${API_URL}/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      })
      return res.ok
    } catch (err) {
      console.error(err)
      return false
    }
  }
}

export const adminService = new AdminService()
