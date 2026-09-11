// ============================================================================
// NETS Admin — Central Zustand Store
// ============================================================================
import { create } from 'zustand'
import { API_URL } from '../../config/api'
import {
  mockQuotes, mockBookings, mockCustomers, mockUsers,
  mockAdminVehicles, mockActivityLog, mockPromotions, mockDrivers,
} from '../data/mockData'

// ── Types ─────────────────────────────────────────────────────────────────────
export interface AdminDriver {
  id: string; name: string; phone: string; licenseNumber: string
  status: 'active' | 'on-trip' | 'off-duty' | 'inactive'
  assignedVehicleId: string | null; totalTrips: number
}

export interface AdminVehicle {
  id: string; name: string; slug: string; capacity: number; category: string
  imageUrl: string; registrationNumber: string; insuranceExpiry: string
  maintenanceStatus: 'ok' | 'service-due' | 'in-service' | 'retired'
  available: boolean; visible: boolean; pricingCategory: string
  features: string[]
}

export interface AdminCustomer {
  id: string; fullName: string; email: string; phone: string
  company: string | null; type: 'corporate' | 'individual'
  totalBookings: number; totalSpend: number; createdAt: string; notes: string
}

export interface AdminQuote {
  id: string; reference: string; customerId: string; customerName: string
  customerEmail: string; customerPhone?: string; vehicleId: string; vehicleName: string
  pickup: string; destination: string; distanceKm: number; durationMins: number
  tripType: string; passengerCount: number; travelDate: string
  estimatedInvestment: number; status: 'new' | 'reviewed' | 'approved' | 'rejected' | 'converted'
  createdAt: string; notes: string
  additionalVehicles?: string[]
}

export interface AdminBooking {
  id: string; reference: string; quoteReference: string | null
  customerId: string; customerName: string; vehicleId: string; vehicleName: string
  driverId: string | null; driverName: string | null
  pickup: string; destination: string; distanceKm: number; durationMins: number
  tripType: string; passengerCount: number; travelDate: string
  totalAmount: number
  paymentStatus: 'pending' | 'partial' | 'paid' | 'invoiced' | 'overdue'
  operationalStatus: 'pending' | 'confirmed' | 'dispatched' | 'completed' | 'cancelled'
  createdAt: string; notes: string
}

export interface AdminUser {
  id: string; fullName: string; email: string
  role: 'admin' | 'staff' | string
  status: 'active' | 'inactive'; lastLogin: string
}

export interface ActivityLogEntry {
  id: string; userId: string; userName: string; action: string; entity: string
  entityId: string; description: string; timestamp: string
  previousValue: string | null; newValue: string | null
}

export interface Promotion {
  id: string; title: string; type: 'banner' | 'offer' | 'campaign'; description: string
  startDate: string; endDate: string; visible: boolean; ctaText: string; ctaUrl: string
  priority: number; status: 'active' | 'scheduled' | 'expired' | 'draft'
}

export interface SystemSettings {
  businessName: string; businessEmail: string; businessPhone: string
  businessWhatsApp: string; businessAddress: string; serviceAreas: string[]
  operatingHours: string; googleMapsApiKey: string; pricingEngineVersion: string
  metaPixelId: string
  notificationNewBooking: boolean
  notificationLeadAssigned: boolean
  adminNotificationEmails: string
}

// ── Auth ─────────────────────────────────────────────────────────────────────
export interface AdminSession {
  isAuthenticated: boolean
  user: AdminUser | null
}

// ── Store Interface ───────────────────────────────────────────────────────────
interface AdminStore {
  // Auth
  session: AdminSession
  login: (email: string, password: string) => Promise<boolean>
  logout: () => void

  // Data
  quotes: AdminQuote[]
  bookings: AdminBooking[]
  customers: AdminCustomer[]
  vehicles: AdminVehicle[]
  drivers: AdminDriver[]
  users: AdminUser[]
  activityLog: ActivityLogEntry[]
  promotions: Promotion[]
  settings: SystemSettings

  // Global Search
  searchQuery: string
  searchOpen: boolean
  setSearchQuery: (q: string) => void
  setSearchOpen: (open: boolean) => void

  // Quotes Actions
  updateQuoteStatus: (id: string, status: AdminQuote['status'], userId: string, userName: string) => void
  addQuoteNote: (id: string, note: string) => void

  // Bookings Actions
  createBooking: (booking: Omit<AdminBooking, 'id' | 'reference' | 'createdAt'>) => void
  deleteBooking: (id: string) => void
  updateBookingStatus: (id: string, operationalStatus: AdminBooking['operationalStatus'], userId: string, userName: string) => void
  updatePaymentStatus: (id: string, paymentStatus: AdminBooking['paymentStatus']) => void
  addBookingNote: (id: string, note: string) => void
  assignBookingDriver: (id: string, driverId: string | null, driverName: string | null) => void

  // Vehicle Actions
  addVehicle: (v: Omit<AdminVehicle, 'id'>) => void
  updateVehicle: (id: string, updates: Partial<AdminVehicle>) => void
  archiveVehicle: (id: string, userId: string, userName: string) => void

  // Customer Actions
  addCustomerNote: (id: string, note: string) => void

  // User & Profile Actions
  addUser: (u: Omit<AdminUser, 'id' | 'lastLogin'>) => void
  updateUserStatus: (id: string, status: AdminUser['status']) => void
  updateProfile: (fullName: string, newPassword?: string) => Promise<boolean>

  // Promotions Actions
  addPromotion: (p: Omit<Promotion, 'id'>) => void
  updatePromotion: (id: string, updates: Partial<Promotion>) => void
  deletePromotion: (id: string) => void

  fetchSettings: () => Promise<void>
  updateSettings: (updates: Partial<SystemSettings>) => Promise<boolean>

  // Audit
  addActivityEntry: (entry: Omit<ActivityLogEntry, 'id' | 'timestamp'>) => void
}

// Mock credentials
const MOCK_CREDENTIALS = [
  { email: 'admin@netsnigeria.com', password: 'nets2026', userId: 'usr-001' },
  { email: 'admin@neweratransports.com', password: 'nets2026', userId: 'usr-001' },
  { email: 'info@neweratransports.com', password: 'nets2026', userId: 'usr-001' },
  { email: 'reedbreeddigital@gmail.com', password: 'nets2026', userId: 'usr-002' },
  { email: 'olateju.daniel@neweratransports.com', password: 'nets2026', userId: 'usr-staff-01' },
  { email: 'supo89@hotmail.com', password: 'nets2026', userId: 'usr-staff-02' },
  { email: 'socialmedia@neweratransports.com', password: 'nets2026', userId: 'usr-staff-03' },
]

const defaultSettings: SystemSettings = {
  businessName: 'New Era Transport Services Ltd',
  businessEmail: 'info@neweratransports.com',
  businessPhone: '+234 916 791 9439',
  businessWhatsApp: '+234 803 300 6805',
  businessAddress: 'No. 2 Raji Rasaki, before linked bridge, Amuwo-Odofin, Lagos, Nigeria',
  serviceAreas: ['Lagos', 'Abuja', 'Port Harcourt', 'Ibadan', 'Kano'],
  operatingHours: 'Monday – Saturday: 6:00AM – 10:00PM',
  googleMapsApiKey: '••••••••••••••••••••••••••••••••',
  pricingEngineVersion: '1.0.0',
  metaPixelId: '',
  notificationNewBooking: true,
  notificationLeadAssigned: true,
  adminNotificationEmails: 'admin@neweratransports.com',
}

const loadInitialSettings = (): SystemSettings => {
  return defaultSettings
}

let entryCounter = 1000

const loadInitialSession = (): AdminSession => {
  try {
    const stored = localStorage.getItem('nets_admin_session')
    if (stored) {
      const parsed = JSON.parse(stored)
      if (parsed && parsed.isAuthenticated && parsed.user) return parsed
    }
  } catch (err) {
    console.warn('Could not load stored admin session', err)
  }
  return { isAuthenticated: false, user: null }
}

export const useAdminStore = create<AdminStore>((set, get) => ({
  // ── Auth ──
  session: loadInitialSession(),

  login: async (email, password) => {
    const cleanEmail = (email || '').trim().toLowerCase()
    const cleanPass = (password || '').trim()

    const saveSession = (user: any) => {
      const sessionObj = { isAuthenticated: true, user }
      try {
        localStorage.setItem('nets_admin_session', JSON.stringify(sessionObj))
      } catch (err) {
        console.warn('Could not save admin session', err)
      }
      set({ session: sessionObj })
    }

    // Attempt to fetch from DB first (simulate login)
    try {
      const res = await fetch('https://nets-web-backend.onrender.com/api/v1/users')
      if (res.ok) {
        const json = await res.json()
        const dbUsers = json.data?.users || []
        const dbUser = dbUsers.find((u: any) => u.email.toLowerCase() === cleanEmail)
        if (dbUser) {
          // If a DB user is found, allow them in with specific master passwords
          if (['nets2026', '*reedb4b4'].includes(cleanPass.toLowerCase())) {
            saveSession({ ...dbUser, fullName: dbUser.fullName, email: dbUser.email, role: dbUser.role })
            return true
          }
        }
      }
    } catch (err) {
      console.warn('Could not fetch DB users for login fallback', err)
    }

    // Check user-updated custom passwords
    try {
      const customPasswords = JSON.parse(localStorage.getItem('nets_user_passwords') || '{}')
      if (customPasswords[cleanEmail]) {
        if (cleanPass === customPasswords[cleanEmail]) {
          const user = mockUsers.find(u => u.email.toLowerCase() === cleanEmail) || {
            id: `usr-${cleanEmail.replace(/[^a-zA-Z0-9]/g, '')}`,
            fullName: cleanEmail.split('@')[0].replace('.', ' '),
            email: cleanEmail,
            role: cleanEmail.includes('admin') || cleanEmail === 'reedbreeddigital@gmail.com' ? 'admin' : 'staff',
            status: 'active',
            lastLogin: new Date().toISOString()
          }
          saveSession(user)
          return true
        } else {
          return false
        }
      }
    } catch (err) {}

    const cred = MOCK_CREDENTIALS.find(c => c.email.toLowerCase() === cleanEmail && c.password === cleanPass)
    if (cred) {
      const user = mockUsers.find(u => u.id === cred.userId || u.email.toLowerCase() === cleanEmail) ?? mockUsers[0]
      saveSession(user)
      return true
    }

    return false
  },

  logout: () => {
    try {
      localStorage.removeItem('nets_admin_session')
    } catch (err) {}
    set({ session: { isAuthenticated: false, user: null } })
  },

  // ── Data ──
  quotes: [],
  bookings: [],
  customers: [],
  vehicles: [],
  drivers: [...mockDrivers],
  users: [...mockUsers],
  activityLog: [...mockActivityLog],
  promotions: [...mockPromotions],
  settings: loadInitialSettings(),

  // ── Search ──
  searchQuery: '',
  searchOpen: false,
  setSearchQuery: (q) => set({ searchQuery: q }),
  setSearchOpen: (open) => set({ searchOpen: open }),

  // ── Quotes ──
  updateQuoteStatus: (id, status, userId, userName) => {
    const q = get().quotes.find(x => x.id === id)
    if (!q) return
    set(s => ({ quotes: s.quotes.map(x => x.id === id ? { ...x, status } : x) }))
    get().addActivityEntry({ userId, userName, action: `Quote ${status.charAt(0).toUpperCase() + status.slice(1)}`, entity: 'Quote', entityId: id, description: `${status} quote ${q.reference} for ${q.customerName}`, previousValue: q.status, newValue: status })
  },

  addQuoteNote: (id, note) => {
    try {
      const raw = localStorage.getItem('nets_quote_notes')
      const notesMap = raw ? JSON.parse(raw) : {}
      notesMap[id] = note
      notesMap[id.toLowerCase()] = note
      localStorage.setItem('nets_quote_notes', JSON.stringify(notesMap))
    } catch (err) {
      console.warn('Could not save note to localStorage', err)
    }
    set(s => ({
      quotes: s.quotes.map(x =>
        x.id === id || x.reference.toLowerCase() === id.toLowerCase()
          ? { ...x, notes: note }
          : x
      ),
    }))
  },

  // ── Bookings ──
  createBooking: (booking) => {
    const ref = `BK-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${String(entryCounter++).padStart(3,'0')}`
    const newBooking: AdminBooking = { ...booking, id: `bk-${ref}`, reference: ref, createdAt: new Date().toISOString() }
    set(s => ({ bookings: [newBooking, ...s.bookings] }))
  },

  deleteBooking: (id) =>
    set(s => ({
      bookings: s.bookings.filter(b => b.id !== id && b.reference !== id),
    })),

  updateBookingStatus: (id, operationalStatus, userId, userName) => {
    const b = get().bookings.find(x => x.id === id)
    if (!b) return
    set(s => ({ bookings: s.bookings.map(x => x.id === id ? { ...x, operationalStatus } : x) }))
    get().addActivityEntry({ userId, userName, action: `Booking ${operationalStatus}`, entity: 'Booking', entityId: id, description: `Updated ${b.reference} to ${operationalStatus}`, previousValue: b.operationalStatus, newValue: operationalStatus })
  },

  updatePaymentStatus: (id, paymentStatus) =>
    set(s => ({ bookings: s.bookings.map(x => x.id === id ? { ...x, paymentStatus } : x) })),

  addBookingNote: (id, note) =>
    set(s => ({ bookings: s.bookings.map(x => x.id === id ? { ...x, notes: note } : x) })),

  assignBookingDriver: (id, driverId, driverName) =>
    set(s => ({ bookings: s.bookings.map(x => x.id === id ? { ...x, driverId, driverName } : x) })),

  // ── Vehicles ──
  addVehicle: (v) => {
    const id = `veh-${Date.now()}`
    set(s => ({ vehicles: [...s.vehicles, { ...v, id }] }))
  },

  updateVehicle: (id, updates) =>
    set(s => ({ vehicles: s.vehicles.map(x => x.id === id ? { ...x, ...updates } : x) })),

  archiveVehicle: (id, userId, userName) => {
    const v = get().vehicles.find(x => x.id === id)
    if (!v) return
    set(s => ({ vehicles: s.vehicles.map(x => x.id === id ? { ...x, available: false, visible: false } : x) }))
    get().addActivityEntry({ userId, userName, action: 'Vehicle Archived', entity: 'Vehicle', entityId: id, description: `Archived ${v.name} (${v.registrationNumber})`, previousValue: 'active', newValue: 'archived' })
  },

  // ── Customers ──
  addCustomerNote: (id, note) =>
    set(s => ({ customers: s.customers.map(x => x.id === id ? { ...x, notes: note } : x) })),

  // ── Users ──
  addUser: (u) => {
    const id = `usr-${Date.now()}`
    set(s => ({ users: [...s.users, { ...u, id, lastLogin: '' }] }))
  },

  updateUserStatus: (id, status) =>
    set(s => ({ users: s.users.map(x => x.id === id ? { ...x, status } : x) })),

  updateProfile: async (fullName, newPassword) => {
    const s = get()
    if (!s.session.user) return false

    const cleanName = fullName.trim()
    const updatedUser = { ...s.session.user, fullName: cleanName }
    const updatedSession = { ...s.session, user: updatedUser }

    try {
      localStorage.setItem('nets_admin_session', JSON.stringify(updatedSession))
      if (newPassword && newPassword.trim()) {
        const customPasswords = JSON.parse(localStorage.getItem('nets_user_passwords') || '{}')
        customPasswords[s.session.user.email.toLowerCase()] = newPassword.trim()
        localStorage.setItem('nets_user_passwords', JSON.stringify(customPasswords))
      }
    } catch (err) {
      console.warn('Could not save updated profile in local storage', err)
    }

    set({
      session: updatedSession,
      users: s.users.map(u => u.id === updatedUser.id ? { ...u, fullName: cleanName } : u)
    })

    // Also persist name update to backend REST API
    try {
      await fetch(`${API_URL}/users/${updatedUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName: cleanName }),
      })
    } catch (err) {}

    return true
  },

  // ── Promotions ──
  addPromotion: (p) => {
    const id = `promo-${Date.now()}`
    set(s => ({ promotions: [...s.promotions, { ...p, id }] }))
  },

  updatePromotion: (id, updates) =>
    set(s => ({ promotions: s.promotions.map(x => x.id === id ? { ...x, ...updates } : x) })),

  deletePromotion: (id) =>
    set(s => ({ promotions: s.promotions.filter(x => x.id !== id) })),

  // ── Settings ──
  fetchSettings: async () => {
    try {
      const res = await fetch(`${API_URL}/settings`)
      if (res.ok) {
        const json = await res.json()
        if (json.data && Object.keys(json.data).length > 0) {
          set(s => ({ settings: { ...s.settings, ...json.data } }))
        }
      }
    } catch (err) {
      console.error('Failed to load settings', err)
    }
  },

  updateSettings: async (updates) => {
    const s = get()
    const newSettings = { ...s.settings, ...updates }
    set({ settings: newSettings })
    try {
      const res = await fetch(`${API_URL}/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings)
      })
      return res.ok
    } catch (err) {
      return false
    }
  },

  // ── Audit ──
  addActivityEntry: (entry) => {
    const id = `act-${++entryCounter}`
    const newEntry: ActivityLogEntry = { ...entry, id, timestamp: new Date().toISOString() }
    set(s => ({ activityLog: [newEntry, ...s.activityLog] }))
  },
}))
