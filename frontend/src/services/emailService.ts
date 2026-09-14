// ============================================================================
// NETS Enterprise Lead Management - Email Service
// ============================================================================
// Dispatches transactional and notification emails via the PHP Email Proxy API
// hosted on mail.neweratransports.com (bypassing cloud SMTP restrictions).
// ============================================================================

import { EMAIL_PROXY_URL, EMAIL_PROXY_KEY } from '../config/api'

class EmailService {
  /**
   * Send a branded confirmation email to the customer.
   */
  public async sendConfirmationEmail(payload: any): Promise<boolean> {
    const customerEmail = payload.customerInformation?.email || payload.customerEmail
    const customerName = payload.customerInformation?.name || payload.customerName || 'Valued Customer'
    const quoteRef = payload.leadMetadata?.quoteReferenceNumber || payload.leadReference || payload.reference || 'NETS-QUOTE'
    const journeyType = payload.journeyInformation?.journeyType || payload.journeyType || 'Charter Journey'
    const totalNum = payload.estimatedInvestment?.total || payload.estimatedInvestment?.estimatedInvestment || payload.estimatedInvestment || 0
    const estimate = totalNum ? `NGN ${Math.round(totalNum).toLocaleString('en-NG')}` : 'NGN ---,---'
    const pickup = payload.journeyInformation?.pickup?.address || payload.journeyInformation?.pickup || payload.origin || payload.pickup || 'Lagos, Nigeria'
    const destination = payload.journeyInformation?.destination?.address || payload.journeyInformation?.destination || payload.destination || 'Lagos, Nigeria'
    const stopsRaw = payload.journeyInformation?.stops || payload.stops || payload.payload?.journeyInformation?.stops || []
    const stops: any[] = Array.isArray(stopsRaw) ? stopsRaw : []
    const travelDateRaw = payload.journeyInformation?.travelDate || payload.travelDate
    const travelDate = travelDateRaw ? new Date(travelDateRaw).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Flexible Schedule'
    const departureTime = payload.journeyInformation?.departureTime ? ` at ${payload.journeyInformation.departureTime}` : ''
    const returnDateRaw = payload.journeyInformation?.returnDate
    const returnDate = returnDateRaw ? new Date(returnDateRaw).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }) : ''
    const returnTime = payload.journeyInformation?.returnTime ? ` at ${payload.journeyInformation.returnTime}` : ''
    const vehicle = payload.estimatedInvestment?.vehicleName || payload.vehicleName || payload.journeyType || 'Executive Fleet'
    const pax = payload.journeyInformation?.passengerCount || payload.passengerCount || 'Group'
    const tripType = payload.journeyInformation?.tripType || payload.tripType || 'Drop-Off'

    // Distance and Retention extraction
    const distanceKm = Number(
      payload.journeyInformation?.distanceKm || 
      payload.distanceKm || 
      payload.estimatedInvestment?.distanceKm || 
      payload.payload?.journeyInformation?.distanceKm || 
      0
    )
    const retentionFee = Number(
      payload.estimatedInvestment?.retentionFee || 
      payload.estimatedInvestment?.additionalRetentionFee || 
      payload.retentionFee || 
      payload.payload?.estimatedInvestment?.retentionFee || 
      0
    )
    const retentionDays = Number(
      payload.estimatedInvestment?.retentionDays || 
      payload.journeyInformation?.retentionDays || 
      payload.retentionDays || 
      0
    )
    const vehicleMobility = payload.journeyInformation?.vehicleMobility || payload.vehicleMobility || 'parked'
    
    let schedule = `${travelDate}${departureTime}`
    if (returnDate && tripType !== 'Drop-Off' && tripType !== 'One-Way' && tripType !== 'One Way') {
      schedule += ` (Return: ${returnDate}${returnTime})`
    }

    const originUrl = typeof window !== 'undefined' && window.location?.origin ? window.location.origin : 'https://neweratransports.com'
    const paymentUrl = `${originUrl}/pay/${encodeURIComponent(quoteRef)}`

    if (!customerEmail || customerEmail === 'N/A') {
      console.warn('[EMAIL SERVICE] Customer email missing, skipping dispatch.')
      return false
    }

    const htmlBody = `
      <div style="font-family: Arial, -apple-system, BlinkMacSystemFont, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px; background: #ffffff;">
        <div style="margin-bottom: 24px; text-align: center;">
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin: 0 auto;">
            <tr>
              <td style="padding-right: 14px; vertical-align: middle;">
                <a href="https://neweratransports.com" target="_blank" style="text-decoration: none; display: block;">
                  <img src="https://neweratransports.com/logo.png" alt="NETS" width="110" style="display: block; width: 110px; height: auto; border: 0;" />
                </a>
              </td>
              <td style="vertical-align: middle; text-align: left;">
                <h1 style="color: #0A3041; margin: 0; font-size: 21px; line-height: 1.1; font-weight: 800;">NEW ERA TRANSPORT SERVICES</h1>
                <p style="color: #C40000; font-weight: 700; text-transform: uppercase; margin: 4px 0 0 0; font-size: 10px; letter-spacing: 0.1em; line-height: 1;">Enterprise Logistics & Executive Charters</p>
              </td>
            </tr>
          </table>
        </div>

        <h2 style="color: #0A3041; font-size: 18px; margin-bottom: 8px;">Hello ${customerName},</h2>
        <p style="color: #475569; line-height: 1.6; margin-top: 0; font-size: 14px;">Thank you for choosing New Era Transport Services. Your official journey quotation and payment checkout are prepared below.</p>

        <div style="background: #F8FAFC; border-left: 4px solid #0A3041; padding: 16px; margin: 20px 0; border-radius: 4px;">
          <p style="margin: 0 0 8px 0; font-size: 13.5px;"><strong>Quotation Reference:</strong> <code style="color: #C40000; font-weight: 700;">${quoteRef}</code></p>
          <p style="margin: 0 0 8px 0; font-size: 13.5px;"><strong>Service Type:</strong> ${journeyType} (${tripType})</p>
          <p style="margin: 0 0 8px 0; font-size: 13.5px;"><strong>Route:</strong> ${pickup} &rarr; ${destination} ${distanceKm > 0 ? `<span style="color: #64748B;">(${Math.round(distanceKm)} km)</span>` : ''}</p>
          ${stops.length > 0 ? `<p style="margin: 0 0 8px 0; font-size: 13.5px;"><strong>En-Route Stops (${stops.length}):</strong> ${stops.map((s: any, i: number) => `Stop ${i+1}: ${s?.displayName || s?.address || (typeof s === 'string' ? s : `Stop ${i+1}`)}`).join(' &bull; ')}</p>` : ''}
          ${distanceKm > 0 ? `<p style="margin: 0 0 8px 0; font-size: 13.5px;"><strong>Calculated Distance:</strong> ${Math.round(distanceKm)} km</p>` : ''}
          <p style="margin: 0 0 8px 0; font-size: 13.5px;"><strong>Schedule:</strong> ${schedule}</p>
          <p style="margin: 0 0 8px 0; font-size: 13.5px;"><strong>Vehicle Category:</strong> ${vehicle}</p>
          <p style="margin: 0; font-size: 13.5px;"><strong>Passenger Group:</strong> ${pax}</p>
          ${retentionFee > 0 || retentionDays > 0 ? `
          <p style="margin: 8px 0 0 0; font-size: 13.5px;"><strong>Vehicle Retention:</strong> ${retentionDays > 0 ? `${retentionDays} day(s) retained (${vehicleMobility})` : `Retained (${vehicleMobility})`}</p>
          ` : ''}
          <table style="width: 100%; border-collapse: collapse; margin-top: 14px; border-top: 1px solid #e2e8f0;">
            <tr>
              <td style="padding-top: 10px; font-weight: bold; font-size: 14px; color: #0A3041;">Total Investment:</td>
              <td style="padding-top: 10px; text-align: right; font-weight: 800; font-size: 17px; color: #C40000;">${estimate}</td>
            </tr>
          </table>
        </div>

        <div style="text-align: center; margin: 30px 0 20px;">
          <a href="${paymentUrl}" style="display: inline-block; background: #C40000; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 4px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 12px rgba(196, 0, 0, 0.25);">
            Accept Quote & Pay Online Now &rarr;
          </a>
          <p style="margin-top: 12px; font-size: 12px; color: #64748B;">
            Or copy and paste this payment link in your browser:<br/>
            <a href="${paymentUrl}" style="color: #0A3041; word-break: break-all;">${paymentUrl}</a>
          </p>
        </div>

        <p style="color: #475569; font-size: 13px; line-height: 1.5; margin-top: 24px;">If you have any questions or require custom modifications, please reach our enterprise desk at <a href="mailto:info@neweratransports.com" style="color: #C40000;">info@neweratransports.com</a> or call <strong>+234 916 791 9439</strong>.</p>
        
        <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #e2e8f0; text-align: center; color: #94a3b8; font-size: 12px;">
          &copy; ${new Date().getFullYear()} New Era Transport Services Ltd. 2 Raji Rasaki Estate Rd, Amuwo Odofin, Lagos, Nigeria.
        </div>
      </div>
    `

    try {
      const res = await fetch(EMAIL_PROXY_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${EMAIL_PROXY_KEY}`,
          'X-API-Key': EMAIL_PROXY_KEY,
        },
        body: JSON.stringify({
          to: customerEmail,
          subject: `Your Journey Quotation & Payment Link [${quoteRef}] - NETS`,
          html: htmlBody,
          text: `Hello ${customerName}. Your official quote ${quoteRef} is ready. Route: ${pickup} to ${destination}. Total: ${estimate}. Pay securely online at: ${paymentUrl}`,
          from: 'hello@neweratransports.com',
          from_name: 'NETS Logistics',
        }),
      })

      if (res.ok) {
        console.log(`[EMAIL SERVICE] Customer quotation email sent to ${customerEmail}`)
        return true
      }
    } catch (err) {
      console.warn('[EMAIL SERVICE] Could not dispatch via email proxy:', err)
    }

    return true
  }

  /**
   * Send a formal Booking Confirmation email to the customer with journey details and cost summary.
   */
  public async sendClientBookingConfirmationEmail(booking: any): Promise<boolean> {
    const customerEmail = booking.customerEmail || booking.customerInformation?.email
    const customerName = booking.customerName || booking.customerInformation?.name || 'Valued Customer'
    const bookingRef = booking.reference || booking.id || `NETS-BK-${Date.now()}`
    const vehicle = booking.vehicleName || booking.estimatedInvestment?.vehicleName || 'Executive Charter Fleet'
    const pickup = booking.pickup || booking.origin || 'Lagos, Nigeria'
    const destination = booking.destination || 'Lagos, Nigeria'
    const bookingStopsRaw = booking.journeyInformation?.stops || booking.stops || booking.payload?.journeyInformation?.stops || []
    const bookingStops: any[] = Array.isArray(bookingStopsRaw) ? bookingStopsRaw : []
    const travelDateRaw = booking.travelDate || booking.createdAt
    const travelDateFormatted = travelDateRaw ? new Date(travelDateRaw).toLocaleDateString('en-NG', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' }) : 'Confirmed'
    const amountNum = booking.totalAmount || booking.estimatedInvestment?.total || 0
    const fmtAmount = amountNum ? `NGN ${Math.round(amountNum).toLocaleString('en-NG')}` : 'NGN ---,---'
    const paymentStatus = (booking.paymentStatus || 'Paid & Confirmed').toUpperCase()

    // Distance and Retention extraction
    const distanceKm = Number(
      booking.journeyInformation?.distanceKm || 
      booking.distanceKm || 
      booking.estimatedInvestment?.distanceKm || 
      booking.payload?.journeyInformation?.distanceKm || 
      0
    )
    const retentionFee = Number(
      booking.estimatedInvestment?.retentionFee || 
      booking.estimatedInvestment?.additionalRetentionFee || 
      booking.retentionFee || 
      booking.payload?.estimatedInvestment?.retentionFee || 
      0
    )
    const retentionDays = Number(
      booking.estimatedInvestment?.retentionDays || 
      booking.journeyInformation?.retentionDays || 
      booking.retentionDays || 
      0
    )
    const vehicleMobility = booking.journeyInformation?.vehicleMobility || booking.vehicleMobility || 'parked'

    if (!customerEmail || customerEmail === 'N/A') {
      console.warn('[EMAIL SERVICE] Customer email missing for booking confirmation.')
      return false
    }

    const htmlBody = `
      <div style="font-family: Arial, -apple-system, BlinkMacSystemFont, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px; background: #ffffff;">
        <div style="margin-bottom: 24px; text-align: center;">
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin: 0 auto;">
            <tr>
              <td style="padding-right: 14px; vertical-align: middle;">
                <a href="https://neweratransports.com" target="_blank" style="text-decoration: none; display: block;">
                  <img src="https://neweratransports.com/logo.png" alt="NETS" width="110" style="display: block; width: 110px; height: auto; border: 0;" />
                </a>
              </td>
              <td style="vertical-align: middle; text-align: left;">
                <h1 style="color: #0A3041; margin: 0; font-size: 21px; line-height: 1.1; font-weight: 800;">NEW ERA TRANSPORT SERVICES</h1>
                <p style="color: #C40000; font-weight: 700; text-transform: uppercase; margin: 4px 0 0 0; font-size: 10px; letter-spacing: 0.1em; line-height: 1;">Enterprise Logistics & Executive Charters</p>
              </td>
            </tr>
          </table>
        </div>

        <div style="background: #F0FDF4; border-left: 4px solid #16a34a; padding: 16px; margin: 20px 0; border-radius: 4px;">
          <h2 style="color: #166534; font-size: 18px; margin: 0 0 6px;">Booking Confirmed & Scheduled!</h2>
          <p style="color: #15803D; margin: 0; font-size: 14px;">Dear ${customerName}, your vehicle reservation is locked in with NETS.</p>
        </div>

        <div style="background: #F8FAFC; border: 1px solid #e2e8f0; padding: 16px; margin: 20px 0; border-radius: 4px;">
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr><td style="padding: 6px 0; font-weight: bold; width: 140px; color: #475569; border-bottom: 1px solid #e2e8f0;">Booking Reference:</td><td style="padding: 6px 0; color: #C40000; font-family: monospace; font-weight: bold; border-bottom: 1px solid #e2e8f0;">${bookingRef}</td></tr>
            <tr><td style="padding: 6px 0; font-weight: bold; color: #475569; border-bottom: 1px solid #e2e8f0;">Vehicle Assigned:</td><td style="padding: 6px 0; color: #0A3041; font-weight: 600; border-bottom: 1px solid #e2e8f0;">${vehicle}</td></tr>
            <tr><td style="padding: 6px 0; font-weight: bold; color: #475569; border-bottom: 1px solid #e2e8f0;">Pickup Location:</td><td style="padding: 6px 0; color: #0A3041; border-bottom: 1px solid #e2e8f0;">${pickup}</td></tr>
            <tr><td style="padding: 6px 0; font-weight: bold; color: #475569; border-bottom: 1px solid #e2e8f0;">Destination:</td><td style="padding: 6px 0; color: #0A3041; border-bottom: 1px solid #e2e8f0;">${destination}</td></tr>
            ${bookingStops.length > 0 ? `<tr><td style="padding: 6px 0; font-weight: bold; color: #475569; border-bottom: 1px solid #e2e8f0;">En-Route Stops:</td><td style="padding: 6px 0; color: #0A3041; border-bottom: 1px solid #e2e8f0;">${bookingStops.map((s: any, i: number) => `Stop ${i+1}: ${s?.displayName || s?.address || (typeof s === 'string' ? s : `Stop ${i+1}`)}`).join('<br/>')}</td></tr>` : ''}
            ${distanceKm > 0 ? `<tr><td style="padding: 6px 0; font-weight: bold; color: #475569; border-bottom: 1px solid #e2e8f0;">Route Distance:</td><td style="padding: 6px 0; color: #0A3041; font-weight: 600; border-bottom: 1px solid #e2e8f0;">${Math.round(distanceKm)} km</td></tr>` : ''}
            <tr><td style="padding: 6px 0; font-weight: bold; color: #475569; border-bottom: 1px solid #e2e8f0;">Travel Date:</td><td style="padding: 6px 0; color: #0A3041; border-bottom: 1px solid #e2e8f0;">${travelDateFormatted}</td></tr>
            ${retentionDays > 0 ? `
            <tr><td style="padding: 6px 0; font-weight: bold; color: #475569; border-bottom: 1px solid #e2e8f0;">Vehicle Retention:</td><td style="padding: 6px 0; color: #0A3041; font-weight: 600; border-bottom: 1px solid #e2e8f0;">${retentionDays} day(s) (${vehicleMobility})</td></tr>
            ` : ''}
            <tr><td style="padding: 6px 0; font-weight: bold; color: #475569; border-bottom: 1px solid #e2e8f0;">Total Settlement:</td><td style="padding: 6px 0; font-weight: bold; color: #16a34a; font-size: 15px; border-bottom: 1px solid #e2e8f0;">${fmtAmount}</td></tr>
            <tr><td style="padding: 6px 0; font-weight: bold; color: #475569;">Payment Status:</td><td style="padding: 6px 0; font-weight: bold; color: #16a34a;">${paymentStatus}</td></tr>
          </table>
        </div>

        <p style="color: #475569; font-size: 13px; line-height: 1.5;">Your assigned professional driver details and tracking coordinates will be sent via SMS/WhatsApp prior to scheduled departure time.</p>
        <p style="color: #475569; font-size: 13px; line-height: 1.5;">For immediate dispatch assistance, please call our 24/7 hotline at <strong>+234 916 791 9439</strong> or email <a href="mailto:info@neweratransports.com" style="color: #C40000;">info@neweratransports.com</a>.</p>

        <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #e2e8f0; text-align: center; color: #94a3b8; font-size: 12px;">
          &copy; ${new Date().getFullYear()} New Era Transport Services Ltd. All rights reserved.
        </div>
      </div>
    `

    try {
      const res = await fetch(EMAIL_PROXY_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${EMAIL_PROXY_KEY}`,
          'X-API-Key': EMAIL_PROXY_KEY,
        },
        body: JSON.stringify({
          to: customerEmail,
          subject: `Booking Confirmation & Schedule [${bookingRef}] - NETS`,
          html: htmlBody,
          text: `Dear ${customerName}. Your booking ${bookingRef} is confirmed. Route: ${pickup} to ${destination}. Vehicle: ${vehicle}. Date: ${travelDateFormatted}.`,
          from: 'hello@neweratransports.com',
          from_name: 'NETS Logistics',
        }),
      })

      if (res.ok) {
        console.log(`[EMAIL SERVICE] Customer booking confirmation sent to ${customerEmail}`)
        return true
      }
    } catch (err) {
      console.warn('[EMAIL SERVICE] Could not dispatch booking email via proxy:', err)
    }

    return true
  }

  /**
   * Send an immediate internal notification to the Sales / Operations Team (Supo & Social Media).
   */
  public async sendInternalNotification(payload: any): Promise<boolean> {
    const customerName = payload.customerInformation?.name || 'New Client'
    const customerEmail = payload.customerInformation?.email || 'N/A'
    const customerPhone = payload.customerInformation?.phone || 'N/A'
    const quoteRef = payload.leadMetadata?.quoteReferenceNumber || 'NETS-LEAD'
    const journeyType = payload.journeyInformation?.journeyType || 'Standard Charter'
    const estimate = payload.estimatedInvestment?.total ? `NGN ${Math.round(payload.estimatedInvestment.total).toLocaleString('en-NG')}` : 'NGN ---,---'
    const pickup = payload.journeyInformation?.pickup?.address || 'N/A'
    const destination = payload.journeyInformation?.destination?.address || 'N/A'
    const internalStopsRaw = payload.journeyInformation?.stops || payload.stops || payload.payload?.journeyInformation?.stops || []
    const internalStops: any[] = Array.isArray(internalStopsRaw) ? internalStopsRaw : []
    const travelDateRaw = payload.journeyInformation?.travelDate
    const travelDate = travelDateRaw ? new Date(travelDateRaw).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A'
    const returnDateRaw = payload.journeyInformation?.returnDate
    const returnDate = returnDateRaw ? new Date(returnDateRaw).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A'
    const vehicle = payload.estimatedInvestment?.vehicleName || 'Standard Vehicle'
    const pax = payload.journeyInformation?.passengerCount || 'N/A'
    const tripType = payload.journeyInformation?.tripType || 'Drop-Off'
    const schedule = (tripType === 'Drop-Off' || tripType === 'One-Way' || tripType === 'One Way') ? travelDate : `${travelDate} to ${returnDate}`

    const distanceKm = Number(
      payload.journeyInformation?.distanceKm || 
      payload.distanceKm || 
      payload.estimatedInvestment?.distanceKm || 
      payload.payload?.journeyInformation?.distanceKm || 
      0
    )
    const retentionFee = Number(
      payload.estimatedInvestment?.retentionFee || 
      payload.estimatedInvestment?.additionalRetentionFee || 
      payload.retentionFee || 
      0
    )
    const retentionDays = Number(
      payload.estimatedInvestment?.retentionDays || 
      payload.journeyInformation?.retentionDays || 
      0
    )
    const retentionRate = Number(
      payload.estimatedInvestment?.retentionRate || 
      payload.retentionRate || 
      0
    )
    const vehicleMobility = payload.journeyInformation?.vehicleMobility || 'parked'

    const htmlBody = `
      <div style="font-family: Arial, -apple-system, BlinkMacSystemFont, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px; background: #ffffff;">
        <div style="margin-bottom: 24px; text-align: center;">
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin: 0 auto;">
            <tr>
              <td style="padding-right: 14px; vertical-align: middle;">
                <a href="https://neweratransports.com" target="_blank" style="text-decoration: none; display: block;">
                  <img src="https://neweratransports.com/logo.png" alt="NETS" width="110" style="display: block; width: 110px; height: auto; border: 0;" />
                </a>
              </td>
              <td style="vertical-align: middle; text-align: left;">
                <h1 style="color: #0A3041; margin: 0; font-size: 21px; line-height: 1.1; font-weight: 800;">NEW ERA TRANSPORT SERVICES</h1>
                <p style="color: #C40000; font-weight: 700; text-transform: uppercase; margin: 4px 0 0 0; font-size: 10px; letter-spacing: 0.1em; line-height: 1;">Enterprise Logistics & Executive Charters</p>
              </td>
            </tr>
          </table>
        </div>
        <h2 style="color: #C40000; font-size: 18px;">New Lead / Quote Request Captured</h2>
        <p style="color: #475569; line-height: 1.6;">A customer has requested a journey estimate on the website:</p>
        <div style="background: #F8FAFC; border-left: 4px solid #C40000; padding: 16px; margin: 20px 0; border-radius: 4px;">
          <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin: 0;">
            <tr><td style="padding: 6px 0; border-bottom: 1px solid #e2e8f0; font-weight: bold; width: 140px; color: #475569;">Reference:</td><td style="padding: 6px 0; border-bottom: 1px solid #e2e8f0;"><code style="color: #C40000;">${quoteRef}</code></td></tr>
            <tr><td style="padding: 6px 0; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: #475569;">Client Name:</td><td style="padding: 6px 0; border-bottom: 1px solid #e2e8f0; color: #0A3041;">${customerName}</td></tr>
            <tr><td style="padding: 6px 0; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: #475569;">Client Email:</td><td style="padding: 6px 0; border-bottom: 1px solid #e2e8f0; color: #0A3041;">${customerEmail}</td></tr>
            <tr><td style="padding: 6px 0; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: #475569;">Client Phone:</td><td style="padding: 6px 0; border-bottom: 1px solid #e2e8f0; color: #0A3041;">${customerPhone}</td></tr>
            <tr><td style="padding: 6px 0; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: #475569;">Journey Type:</td><td style="padding: 6px 0; border-bottom: 1px solid #e2e8f0; color: #0A3041;">${journeyType} (${tripType})</td></tr>
            <tr><td style="padding: 6px 0; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: #475569;">Route:</td><td style="padding: 6px 0; border-bottom: 1px solid #e2e8f0; color: #0A3041;">${pickup} &rarr; ${destination}</td></tr>
            ${internalStops.length > 0 ? `<tr><td style="padding: 6px 0; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: #475569;">En-Route Stops:</td><td style="padding: 6px 0; border-bottom: 1px solid #e2e8f0; color: #0A3041;">${internalStops.map((s: any, i: number) => `Stop ${i+1}: ${s?.displayName || s?.address || (typeof s === 'string' ? s : `Stop ${i+1}`)}`).join('<br/>')}</td></tr>` : ''}
            ${distanceKm > 0 ? `<tr><td style="padding: 6px 0; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: #475569;">Route Distance:</td><td style="padding: 6px 0; border-bottom: 1px solid #e2e8f0; color: #0A3041; font-weight: 600;">${Math.round(distanceKm)} km</td></tr>` : ''}
            <tr><td style="padding: 6px 0; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: #475569;">Schedule:</td><td style="padding: 6px 0; border-bottom: 1px solid #e2e8f0; color: #0A3041;">${schedule}</td></tr>
            <tr><td style="padding: 6px 0; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: #475569;">Vehicle:</td><td style="padding: 6px 0; border-bottom: 1px solid #e2e8f0; color: #0A3041;">${vehicle}</td></tr>
            <tr><td style="padding: 6px 0; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: #475569;">Passengers:</td><td style="padding: 6px 0; border-bottom: 1px solid #e2e8f0; color: #0A3041;">${pax}</td></tr>
            ${retentionFee > 0 ? `<tr><td style="padding: 6px 0; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: #475569;">Vehicle Retention:</td><td style="padding: 6px 0; border-bottom: 1px solid #e2e8f0; color: #b45309; font-weight: 600;">NGN ${Math.round(retentionFee).toLocaleString('en-NG')} (${retentionDays} days @ NGN ${Math.round(retentionRate).toLocaleString('en-NG')}/day - ${vehicleMobility})</td></tr>` : ''}
            <tr><td style="padding: 6px 0; font-weight: bold; color: #475569;">Estimated Value:</td><td style="padding: 6px 0; font-weight: bold; color: #0A3041; font-size: 16px;">${estimate}</td></tr>
          </table>
        </div>
        <p style="color: #475569; font-size: 13px; line-height: 1.5;">View and manage this lead in the <a href="https://neweratransports.com/admin/crm" style="color: #C40000;">NETS CRM Control Center</a>.</p>
        <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #e2e8f0; text-align: center; color: #94a3b8; font-size: 12px;">
          &copy; ${new Date().getFullYear()} New Era Transport Services Ltd. All rights reserved.
        </div>
      </div>
    `

    const notifyRecipients = ['socialmedia@neweratransports.com', 'supo89@hotmail.com', 'olateju.daniel@neweratransports.com']

    for (const recipient of notifyRecipients) {
      try {
        await fetch(EMAIL_PROXY_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${EMAIL_PROXY_KEY}`,
            'X-API-Key': EMAIL_PROXY_KEY,
          },
          body: JSON.stringify({
            to: recipient,
            subject: `[NEW LEAD] ${customerName} - ${quoteRef}`,
            html: htmlBody,
            text: `New Lead: ${customerName} (${customerEmail}, ${customerPhone}). Ref: ${quoteRef}. Estimate: ${estimate}.`,
            from: 'hello@neweratransports.com',
            from_name: 'NETS CRM Alert',
          }),
        })
      } catch (err) {
        console.warn(`[EMAIL SERVICE] Alert proxy error for ${recipient}:`, err)
      }
    }

    return true
  }

  /**
   * Send an instant new order / booking notification to Supo and Social Media.
   */
  public async sendNewBookingNotification(booking: any): Promise<boolean> {
    const bookingRef = booking.reference || booking.id || `BK-${Date.now()}`
    const customerName = booking.customerName || booking.customerInformation?.name || 'Customer'
    const customerEmail = booking.customerEmail || booking.customerInformation?.email || 'N/A'
    const customerPhone = booking.customerPhone || booking.customerInformation?.phone || 'N/A'
    const vehicle = booking.vehicleName || booking.estimatedInvestment?.vehicleName || 'Standard Vehicle'
    const pickup = booking.pickup || booking.journeyInformation?.pickup?.address || 'N/A'
    const destination = booking.destination || booking.journeyInformation?.destination?.address || 'N/A'
    const travelDate = booking.travelDate || booking.journeyInformation?.travelDate || new Date().toISOString()
    const amount = booking.totalAmount || booking.estimatedInvestment?.total || 0
    const paymentStatus = booking.paymentStatus || booking.paymentInformation?.status || 'Confirmed'

    const fmtAmount = `NGN ${Math.round(amount).toLocaleString('en-NG')}`
    const fmtDate = new Date(travelDate).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })

    const distanceKm = Number(
      booking.journeyInformation?.distanceKm || 
      booking.distanceKm || 
      booking.estimatedInvestment?.distanceKm || 
      booking.payload?.journeyInformation?.distanceKm || 
      0
    )
    const retentionFee = Number(
      booking.estimatedInvestment?.retentionFee || 
      booking.estimatedInvestment?.additionalRetentionFee || 
      booking.retentionFee || 
      0
    )
    const retentionDays = Number(
      booking.estimatedInvestment?.retentionDays || 
      booking.journeyInformation?.retentionDays || 
      0
    )
    const retentionRate = Number(
      booking.estimatedInvestment?.retentionRate || 
      booking.retentionRate || 
      0
    )
    const vehicleMobility = booking.journeyInformation?.vehicleMobility || 'parked'

    const htmlBody = `
      <div style="font-family: Arial, -apple-system, BlinkMacSystemFont, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px; background: #ffffff;">
        <div style="margin-bottom: 24px; text-align: center;">
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin: 0 auto;">
            <tr>
              <td style="padding-right: 14px; vertical-align: middle;">
                <a href="https://neweratransports.com" target="_blank" style="text-decoration: none; display: block;">
                  <img src="https://neweratransports.com/logo.png" alt="NETS" width="110" style="display: block; width: 110px; height: auto; border: 0;" />
                </a>
              </td>
              <td style="vertical-align: middle; text-align: left;">
                <h1 style="color: #0A3041; margin: 0; font-size: 21px; line-height: 1.1; font-weight: 800;">NEW ERA TRANSPORT SERVICES</h1>
                <p style="color: #C40000; font-weight: 700; text-transform: uppercase; margin: 4px 0 0 0; font-size: 10px; letter-spacing: 0.1em; line-height: 1;">Enterprise Logistics & Executive Charters</p>
              </td>
            </tr>
          </table>
        </div>
        <h2 style="color: #0A3041; font-size: 18px;">NEW BOOKING ORDER RECEIVED</h2>
        <p style="color: #475569; line-height: 1.6;">A new booking order has been confirmed on the platform. Please check the details below for immediate dispatch.</p>
        <div style="background: #F8FAFC; border-left: 4px solid #16a34a; padding: 16px; margin: 20px 0; border-radius: 4px;">
          <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin: 0;">
            <tr><td style="padding: 6px 0; font-weight: bold; width: 140px; border-bottom: 1px solid #e2e8f0; color: #475569;">Booking Ref:</td><td style="padding: 6px 0; font-family: monospace; color: #C40000; font-weight: bold; border-bottom: 1px solid #e2e8f0;">${bookingRef}</td></tr>
            <tr><td style="padding: 6px 0; font-weight: bold; border-bottom: 1px solid #e2e8f0; color: #475569;">Customer:</td><td style="padding: 6px 0; border-bottom: 1px solid #e2e8f0; color: #0A3041;">${customerName} (${customerPhone})</td></tr>
            <tr><td style="padding: 6px 0; font-weight: bold; border-bottom: 1px solid #e2e8f0; color: #475569;">Email:</td><td style="padding: 6px 0; border-bottom: 1px solid #e2e8f0; color: #0A3041;">${customerEmail}</td></tr>
            <tr><td style="padding: 6px 0; font-weight: bold; border-bottom: 1px solid #e2e8f0; color: #475569;">Vehicle Assigned:</td><td style="padding: 6px 0; font-weight: bold; color: #0A3041; border-bottom: 1px solid #e2e8f0;">${vehicle}</td></tr>
            <tr><td style="padding: 6px 0; font-weight: bold; border-bottom: 1px solid #e2e8f0; color: #475569;">Pickup:</td><td style="padding: 6px 0; border-bottom: 1px solid #e2e8f0; color: #0A3041;">${pickup}</td></tr>
            <tr><td style="padding: 6px 0; font-weight: bold; border-bottom: 1px solid #e2e8f0; color: #475569;">Destination:</td><td style="padding: 6px 0; border-bottom: 1px solid #e2e8f0; color: #0A3041;">${destination}</td></tr>
            ${distanceKm > 0 ? `<tr><td style="padding: 6px 0; font-weight: bold; color: #475569; border-bottom: 1px solid #e2e8f0;">Route Distance:</td><td style="padding: 6px 0; border-bottom: 1px solid #e2e8f0; color: #0A3041; font-weight: 600;">${Math.round(distanceKm)} km</td></tr>` : ''}
            <tr><td style="padding: 6px 0; font-weight: bold; border-bottom: 1px solid #e2e8f0; color: #475569;">Travel Date:</td><td style="padding: 6px 0; border-bottom: 1px solid #e2e8f0; color: #0A3041;">${fmtDate}</td></tr>
            ${retentionFee > 0 ? `<tr><td style="padding: 6px 0; font-weight: bold; color: #475569; border-bottom: 1px solid #e2e8f0;">Vehicle Retention:</td><td style="padding: 6px 0; border-bottom: 1px solid #e2e8f0; color: #b45309; font-weight: 600;">NGN ${Math.round(retentionFee).toLocaleString('en-NG')} (${retentionDays} days @ NGN ${Math.round(retentionRate).toLocaleString('en-NG')}/day - ${vehicleMobility})</td></tr>` : ''}
            <tr><td style="padding: 6px 0; font-weight: bold; color: #475569; border-bottom: 1px solid #e2e8f0;">Total Paid:</td><td style="padding: 6px 0; font-size: 16px; font-weight: bold; color: #16a34a; border-bottom: 1px solid #e2e8f0;">${fmtAmount}</td></tr>
            <tr><td style="padding: 6px 0; font-weight: bold; color: #475569;">Status:</td><td style="padding: 6px 0; font-weight: bold; color: #16a34a; text-transform: uppercase;">${paymentStatus}</td></tr>
          </table>
        </div>
        <p style="color: #475569; font-size: 13px; line-height: 1.5;">Manage this booking in the <a href="https://neweratransports.com/admin/bookings" style="color: #C40000;">NETS CRM Control Center</a>.</p>
        <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #e2e8f0; text-align: center; color: #94a3b8; font-size: 12px;">
          &copy; ${new Date().getFullYear()} New Era Transport Services Ltd. All rights reserved.
        </div>
      </div>
    `

    // Target recipients: Supo & Social Media Team (+ Daniel)
    const bookingRecipients = [
      'supo89@hotmail.com',
      'socialmedia@neweratransports.com',
      'olateju.daniel@neweratransports.com',
    ]

    for (const recipient of bookingRecipients) {
      try {
        await fetch(EMAIL_PROXY_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${EMAIL_PROXY_KEY}`,
            'X-API-Key': EMAIL_PROXY_KEY,
          },
          body: JSON.stringify({
            to: recipient,
            subject: `[NEW ORDER] ${bookingRef} - ${customerName} (${fmtAmount})`,
            html: htmlBody,
            text: `New Booking Order ${bookingRef} by ${customerName}. Vehicle: ${vehicle}. Route: ${pickup} to ${destination}. Total: ${fmtAmount}.`,
            from: 'hello@neweratransports.com',
            from_name: 'NETS Booking Alert',
          }),
        })
        console.log(`[EMAIL SERVICE] Booking notification dispatched to ${recipient}`)
      } catch (err) {
        console.warn(`[EMAIL SERVICE] Booking notification failed for ${recipient}:`, err)
      }
    }

    return true
  }

  /**
   * Send a password reset email with 6-digit security code.
   */
  public async sendPasswordResetEmail(email: string, resetCode: string, resetLink: string): Promise<boolean> {
    const cleanEmail = email.trim()

    const htmlBody = `
      <div style="font-family: Arial, -apple-system, BlinkMacSystemFont, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px; background: #ffffff;">
        <div style="margin-bottom: 24px; text-align: center;">
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin: 0 auto;">
            <tr>
              <td style="padding-right: 14px; vertical-align: middle;">
                <a href="https://neweratransports.com" target="_blank" style="text-decoration: none; display: block;">
                  <img src="https://neweratransports.com/logo.png" alt="NETS" width="110" style="display: block; width: 110px; height: auto; border: 0;" />
                </a>
              </td>
              <td style="vertical-align: middle; text-align: left;">
                <h1 style="color: #0A3041; margin: 0; font-size: 21px; line-height: 1.1; font-weight: 800;">NEW ERA TRANSPORT SERVICES</h1>
                <p style="color: #C40000; font-weight: 700; text-transform: uppercase; margin: 4px 0 0 0; font-size: 10px; letter-spacing: 0.1em; line-height: 1;">Enterprise Logistics & Executive Charters</p>
              </td>
            </tr>
          </table>
        </div>
        <h2 style="color: #0A3041; font-size: 18px;">Password Reset Request</h2>
        <p style="color: #475569; line-height: 1.6;">We received a request to reset your password for the NETS Admin & Staff portal. Use the verification code below to complete your password reset:</p>
        <div style="background: #F8FAFC; border-left: 4px solid #0A3041; padding: 16px; margin: 20px 0; border-radius: 4px; text-align: center;">
          <div style="display: inline-block; font-size: 32px; font-weight: 800; letter-spacing: 0.25em; color: #0A3041; font-family: monospace; margin: 8px 0;">
            ${resetCode}
          </div>
          <p style="font-size: 12px; color: #64748b; margin: 0;">This code is valid for 15 minutes.</p>
        </div>
        <p style="color: #475569; font-size: 13px; line-height: 1.5;">If you did not request this password reset, please ignore this message or contact your system administrator immediately.</p>
        <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #e2e8f0; text-align: center; color: #94a3b8; font-size: 12px;">
          &copy; ${new Date().getFullYear()} New Era Transport Services Ltd. All rights reserved.
        </div>
      </div>
    `

    try {
      const res = await fetch(EMAIL_PROXY_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${EMAIL_PROXY_KEY}`,
          'X-API-Key': EMAIL_PROXY_KEY,
        },
        body: JSON.stringify({
          to: cleanEmail,
          subject: `Your NETS Portal Password Reset Code: ${resetCode}`,
          html: htmlBody,
          text: `Your password reset code for NETS Control Center is: ${resetCode}. Valid for 15 minutes.`,
          from: 'hello@neweratransports.com',
          from_name: 'NETS Security',
        }),
      })

      if (res.ok) {
        console.log(`[EMAIL SERVICE] Password reset email sent to ${cleanEmail}`)
        return true
      }
    } catch (err) {
      console.warn('[EMAIL SERVICE] Password reset email proxy error:', err)
    }

    return true
  }
}

export const emailService = new EmailService()
