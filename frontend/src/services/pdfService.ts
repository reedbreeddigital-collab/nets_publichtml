// ============================================================================
// NETS Enterprise Lead Management — PDF Service (jsPDF Implementation)
// ============================================================================
// Generates styled, professional PDF quotations with NETS branding & logo.
// ============================================================================

import jsPDF from 'jspdf'

class PDFService {
  /**
   * Helper to convert the favicon.svg logo into a Base64 PNG data URL for jsPDF.
   */
  private async getLogoBase64(): Promise<string | null> {
    if (typeof window === 'undefined') return null
    return new Promise((resolve) => {
      const img = new Image()
      img.crossOrigin = 'Anonymous'
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas')
          canvas.width = img.width || 128
          canvas.height = img.height || 128
          const ctx = canvas.getContext('2d')
          if (ctx) {
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
            resolve(canvas.toDataURL('image/png'))
          } else {
            resolve(null)
          }
        } catch {
          resolve(null)
        }
      }
      img.onerror = () => resolve(null)
      img.src = '/favicon.svg'
    })
  }

  /**
   * Generates a styled PDF quotation document with logo and triggers a browser download.
   */
  public async generateQuotationPDF(payload: any): Promise<void> {
    console.log('📄 [PDF SERVICE] Generating Styled Quotation PDF...')
    
    try {
      const logoDataUrl = await this.getLogoBase64()
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      })

      const ref = payload.leadMetadata?.quoteReferenceNumber || `NETS-${Date.now().toString().slice(-6)}`
      const customerName = payload.customerInformation?.name || 'Valued Customer'
      const customerEmail = payload.customerInformation?.email || 'N/A'
      const customerPhone = payload.customerInformation?.phone || 'N/A'
      const company = payload.customerInformation?.company || 'N/A'

      const journeyType = payload.journeyInformation?.journeyType || 'Standard Charter'
      const vehicle = payload.estimatedInvestment?.vehicleName || 'Standard Vehicle'
      const pickup = payload.journeyInformation?.pickup?.address || 'N/A'
      const destination = payload.journeyInformation?.destination?.address || 'N/A'
      const stops: any[] = Array.isArray(payload.journeyInformation?.stops) ? payload.journeyInformation.stops : []
      const distance = payload.journeyInformation?.distanceKm ? `${payload.journeyInformation.distanceKm} km` : 'N/A'
      const passengers = payload.journeyInformation?.passengerCount || 'N/A'
      const travelDate = payload.journeyInformation?.travelDate 
        ? new Date(payload.journeyInformation.travelDate).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
        : 'N/A'

      const totalCost = payload.estimatedInvestment?.total 
        ? `NGN ${Math.round(payload.estimatedInvestment.total).toLocaleString('en-NG')}` 
        : 'NGN ---,---'
      
      const paymentStatus = payload.paymentInformation?.status === 'paid' ? 'PAID & CONFIRMED' : 'QUOTATION ESTIMATE'
      const payRef = payload.paymentInformation?.paystackReference || 'N/A'

      // Header Band (Modern Navy Background)
      doc.setFillColor(13, 16, 96) // #0D1060
      doc.rect(0, 0, 210, 45, 'F')

      // Draw Favicon Logo if loaded
      let textStartX = 14
      if (logoDataUrl) {
        doc.addImage(logoDataUrl, 'PNG', 14, 11, 24, 24)
        textStartX = 44
      }

      // Header Brand Text
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(18)
      doc.setFont('helvetica', 'bold')
      doc.text('NEW ERA TRANSPORT SERVICES', textStartX, 22)
      
      const isPaid = payload.paymentInformation?.status === 'paid'

      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.text(isPaid ? 'Booking Receipt & Itinerary' : 'Journey Quotation', textStartX, 30)
      
      // Contact info right aligned
      doc.setFontSize(8)
      doc.text('info@neweratransports.com', 196, 22, { align: 'right' })
      doc.text('+234 916 791 9439', 196, 30, { align: 'right' })

      let y = 60
      
      // Top row: Payment Status and Receipt Info
      // Left side: Status Badge
      if (isPaid) {
        doc.setFillColor(34, 197, 94, 0.1) // Light green bg
        doc.setDrawColor(34, 197, 94)
      } else {
        doc.setFillColor(248, 250, 252)
        doc.setDrawColor(203, 213, 225)
      }
      doc.roundedRect(14, y, 90, 24, 2, 2, 'FD')
      
      doc.setTextColor(100, 116, 139)
      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      doc.text('STATUS', 20, y + 8)
      
      if (isPaid) {
        doc.setTextColor(21, 128, 61)
      } else {
        doc.setTextColor(192, 39, 45)
      }
      doc.setFontSize(12)
      doc.text(paymentStatus, 20, y + 16)

      // Right side: Ref Info
      doc.setFillColor(248, 250, 252)
      doc.setDrawColor(226, 232, 240)
      doc.roundedRect(108, y, 88, 24, 2, 2, 'FD')
      
      doc.setTextColor(100, 116, 139)
      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      doc.text('BOOKING REFERENCE', 114, y + 8)
      doc.text('DATE', 165, y + 8)
      
      doc.setTextColor(30, 41, 59)
      doc.setFontSize(11)
      doc.text(ref, 114, y + 16)
      doc.text(new Date().toLocaleDateString('en-NG'), 165, y + 16)

      // Calculate stops height if any
      let stopsExtraHeight = 0
      let splitStops: string[] = []
      if (stops.length > 0) {
        const stopSummaries = stops.map((s: any, i: number) => {
          const addr = s?.displayName || s?.address || (typeof s === 'string' ? s : `Stop ${i+1}`)
          return `Stop ${i + 1}: ${addr}`
        }).join('   •   ')
        splitStops = doc.splitTextToSize(stopSummaries, 166)
        stopsExtraHeight = 10 + (splitStops.length * 4.5)
      }
      const cardHeight = 105 + stopsExtraHeight

      // Main Itinerary Card
      y += 34
      doc.setFillColor(255, 255, 255)
      doc.setDrawColor(226, 232, 240)
      doc.roundedRect(14, y, 182, cardHeight, 3, 3, 'FD')
      
      // Card Header
      doc.setFillColor(248, 250, 252)
      doc.roundedRect(14, y, 182, 12, 3, 3, 'F')
      // Fix bottom corners of header to be square
      doc.rect(14, y + 6, 182, 6, 'F')
      
      doc.setTextColor(15, 23, 42)
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.text('JOURNEY DETAILS', 20, y + 8)

      // Journey Info
      let innerY = y + 22
      doc.setTextColor(100, 116, 139)
      doc.setFontSize(8)
      doc.text('PASSENGER', 20, innerY)
      doc.text('VEHICLE', 114, innerY)
      
      doc.setTextColor(30, 41, 59)
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.text(customerName, 20, innerY + 5)
      doc.text(vehicle, 114, innerY + 5)
      
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.text(customerPhone, 20, innerY + 10)
      doc.text(`Capacity: ${passengers} passengers`, 114, innerY + 10)

      doc.setDrawColor(241, 245, 249)
      doc.line(20, innerY + 16, 186, innerY + 16)

      innerY += 26
      doc.setTextColor(100, 116, 139)
      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      doc.text('PICKUP', 20, innerY)
      doc.text('DROPOFF', 114, innerY)
      
      doc.setTextColor(30, 41, 59)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      
      const splitPickup = doc.splitTextToSize(pickup, 80)
      const splitDropoff = doc.splitTextToSize(destination, 80)
      doc.text(splitPickup, 20, innerY + 5)
      doc.text(splitDropoff, 114, innerY + 5)

      if (stops.length > 0) {
        innerY += 16
        doc.setDrawColor(241, 245, 249)
        doc.line(20, innerY, 186, innerY)
        innerY += 6
        doc.setTextColor(100, 116, 139)
        doc.setFontSize(8)
        doc.setFont('helvetica', 'bold')
        doc.text(`EN-ROUTE STOPS (${stops.length})`, 20, innerY)
        
        doc.setTextColor(30, 41, 59)
        doc.setFontSize(8.5)
        doc.setFont('helvetica', 'normal')
        doc.text(splitStops, 20, innerY + 5)
        innerY += (splitStops.length * 4.5) + 3
      } else {
        innerY += 20
      }

      doc.setDrawColor(241, 245, 249)
      doc.line(20, innerY, 186, innerY)
      
      innerY += 8
      doc.setTextColor(100, 116, 139)
      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      doc.text('TRAVEL DATE', 20, innerY)
      doc.text('TRIP TYPE', 70, innerY)
      doc.text('EST. DISTANCE', 120, innerY)
      
      doc.setTextColor(30, 41, 59)
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.text(travelDate, 20, innerY + 5)
      doc.text(journeyType, 70, innerY + 5)
      doc.text(distance, 120, innerY + 5)

      // Payment Summary Card
      y += cardHeight + 10
      doc.setFillColor(248, 250, 252)
      doc.setDrawColor(226, 232, 240)
      doc.roundedRect(14, y, 182, 36, 3, 3, 'FD')

      doc.setTextColor(100, 116, 139)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.text('PAYMENT SUMMARY', 20, y + 10)
      
      if (payRef !== 'N/A') {
        doc.setFontSize(8)
        doc.text(`Transaction ID: ${payRef}`, 20, y + 16)
      }

      doc.setTextColor(15, 23, 42)
      doc.setFontSize(10)
      doc.text('Amount Paid:', 130, y + 15)
      
      doc.setTextColor(13, 16, 96)
      doc.setFontSize(18)
      doc.setFont('helvetica', 'bold')
      doc.text(totalCost, 130, y + 25)

      // Footer
      doc.setFontSize(8)
      doc.setTextColor(148, 163, 184)
      doc.setFont('helvetica', 'normal')
      doc.text('Includes: Executive Vehicle, Certified Professional Driver, Fuel Allowance, Dispatch Support & Insurance', 105, y + 46, { align: 'center' })
      
      doc.setDrawColor(226, 232, 240)
      doc.line(14, y + 54, 196, y + 54)
      doc.text('Thank you for traveling with New Era Transport Services.', 105, y + 60, { align: 'center' })

      // Save PDF file to trigger download
      const filename = isPaid ? `NETS-Receipt-${ref}.pdf` : `NETS-Quotation-${ref}.pdf`
      doc.save(filename)
      console.log('📄 [PDF SERVICE] PDF generated and downloaded successfully.')
    } catch (err) {
      console.error('❌ [PDF SERVICE] Error generating PDF document:', err)
    }
  }
}

export const pdfService = new PDFService()
