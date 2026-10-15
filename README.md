# New Era Transport Services (NETS) — Enterprise Logistics & Charter Platform

Official web application and executive administration portal for New Era Transport Services Ltd. (NETS Nigeria).

## Features & Modules

### 🚍 Public Journey Planner & Booking Engine
- **Dynamic Pricing Engine**: Automated distance, vehicle category, and duration rate calculations.
- **Interactive Mapbox Integration**: Real-time pickup/destination geocoding, route line rendering, and map bounds controller.
- **Paystack Payment Gateway Integration**: Instant checkout with automated CRM lead submission and post-payment confirmation.
- **Client-Side PDF Quotation Generator**: Styled quotation receipts (`NETS-Quotation-<REF>.pdf`) generated via `jsPDF` complete with NETS logo, journey details, and status badge.

### 📊 Executive Control Center (Admin Portal)
- **CRM Leads & Pipeline (`/admin/crm`)**: Real-time customer lead management, pipeline opportunity tracking, and stage updates.
- **Booking Management (`/admin/bookings`)**: Operational dispatch tracking, status updates, and payment verification.
- **Fleet & Pricing Engine (`/admin/pricing`)**: Centralized vehicle catalog and dynamic rate adjustments.
- **Unified Live Data Sync**: Synchronized real-time KPI metrics across all control center modules connected to REST API database endpoints.

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite, TailwindCSS, Lucide React
- **Mapping & Routing**: Mapbox GL JS, `@vis.gl/react-mapbox`
- **State Management**: Zustand
- **PDF Generation**: jsPDF
- **Backend API**: Go REST API (`https://neweratransports-api.onrender.com/api/v1`)

## Local Development

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Run local development server
npm run dev
```

## Deployment & Production Build

```bash
# Build production bundle
npm run build
```
