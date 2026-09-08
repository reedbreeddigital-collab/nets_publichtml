# NETS Control Center — User Directory & Credentials

This document contains the authenticated staff and administrative accounts configured for the **NETS Enterprise Control Center** (Admin Portal & CRM).

---

## 🔐 Credentials Summary

**Default Password for all accounts:** `nets2026`  
**Admin Portal URL:** `/admin` (or `/admin/login`)

---

## 👥 User Accounts List

### 1. Administrative Accounts (Full Control)

| Name | Email Address | Role | Default Password | Status | Access Scope |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Adebayo Ogundimu** | `admin@netsnigeria.com` | `Super-Admin` | `nets2026` | Active | Full Platform Access |
| **Ifeanyi Reed** | `reedbreeddigital@gmail.com` | `Super-Admin` | `nets2026` | Active | Full Platform Access |
| **NETS Admin Alias** | `admin@neweratransports.com` | `Super-Admin` | `nets2026` | Active | Full Platform Access |
| **NETS Info Alias** | `info@neweratransports.com` | `Super-Admin` | `nets2026` | Active | Full Platform Access |

---

### 2. Active Staff Accounts (Operational Access)

| Name | Email Address | Role | Default Password | Status | Access Scope |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Daniel Olateju** | `olateju.daniel@neweratransports.com` | `Staff` | `nets2026` | Active | CRM, Quotes, Bookings, Customers |
| **Supo** | `supo89@hotmail.com` | `Staff` | `nets2026` | Active | CRM, Quotes, Bookings, Customers |
| **Social Media Team** | `socialmedia@neweratransports.com` | `Staff` | `nets2026` | Active | CRM, Quotes, Bookings, Customers |

---

## 🛡️ Role Permissions Matrix

| Platform Module | Admin / Super-Admin | Staff |
| :--- | :---: | :---: |
| **Executive Dashboard** | ✅ Allowed | ✅ Allowed |
| **CRM & Lead Pipeline** | ✅ Allowed | ✅ Allowed |
| **Quote Management & PDF Export** | ✅ Allowed | ✅ Allowed |
| **Booking & Trip Management** | ✅ Allowed | ✅ Allowed |
| **Customer Profiles** | ✅ Allowed | ✅ Allowed |
| **Fleet Management (Vehicles)** | ✅ Allowed | ❌ Restricted |
| **Pricing Engine Config** | ✅ Allowed | ❌ Restricted |
| **Media Library** | ✅ Allowed | ❌ Restricted |
| **Promotions & Campaigns** | ✅ Allowed | ❌ Restricted |
| **Analytics & Business Intelligence** | ✅ Allowed | ❌ Restricted |
| **User & Staff Account Management** | ✅ Allowed | ❌ Restricted |
| **System Settings & Activity Log** | ✅ Allowed | ❌ Restricted |

---

## 🚀 How to Sign In & Manage Credentials

1. Navigate to `/admin` or `/admin/login`.
2. Enter your assigned email address from the table above.
3. Enter password (default: `nets2026`).
4. Click **Sign In**.

---

## 👤 Profile & Password Management (`/admin/profile`)

All logged-in administrators and staff can update their full name and change their password directly in the portal:
- Navigate to **Account -> My Profile & Security** or click your user avatar in the top bar / sidebar footer.
- **Update Name**: Edit your full name and click **Save Changes** (syncs to MySQL database and session).
- **Change Password**: Provide your current password, enter a new password (min. 6 characters), and click **Update Password**.

---

## 🔑 Forgot Password / Reset Password Utility

If a staff member or administrator forgets their password:
1. Click **"Forgot password?"** on the login screen (`/admin/login`).
2. Enter your registered email address and click **Send Verification Code**.
3. A secure **6-digit verification code** is instantly dispatched to your inbox via the NETS Email Proxy relay.
4. Enter the 6-digit code and set your new password.
5. Click **Reset & Sign In** to immediately access the portal with your new credentials.

---

## ✉️ Automated Email Notifications (Supo & Social Media Team)

Whenever a new order / booking or lead is captured on the platform:
- **New Bookings & Paid Charters**: Dispatches an instant priority alert with client name, phone, route (pickup & dropoff), vehicle, travel date, and total paid to:
  - `supo89@hotmail.com` (Supo)
  - `socialmedia@neweratransports.com` (Social Media Team)
  - `olateju.daniel@neweratransports.com` (Daniel Olateju)
- **New CRM Leads & Quote Requests**: Dispatches client and journey details to the operations team.

---

## 🌐 Email Proxy Deployment Guide (`mail.neweratransports.com`)

The `email_proxy` directory is located at [`email_proxy`](file:///Users/user/Downloads/nets_logistics/email_proxy). It relays transactional emails via Hostinger SMTP over standard HTTPS API calls to bypass cloud SMTP port restrictions:

### Quick Deployment Steps:
1. Log in to **Hostinger hPanel** -> File Manager for `neweratransports.com` (or subdomain `mail.neweratransports.com`).
2. Upload the contents of [`email_proxy`](file:///Users/user/Downloads/nets_logistics/email_proxy) into your web root (e.g. `public_html/email_proxy/` or root of `mail.neweratransports.com`).
3. Ensure [`config/config.php`](file:///Users/user/Downloads/nets_logistics/email_proxy/config/config.php) has the SMTP credentials:
   - **Host:** `smtp.hostinger.com`
   - **Port:** `465` (SMTPS / SSL)
   - **User:** `info@neweratransports.com`
   - **API Key Token:** `ep_live_6f3b92d8a4c1e7f50b4a1d9c2e8f7a3b`
4. The API endpoint is ready at: `POST https://mail.neweratransports.com/api/send-email.php` (or `https://mail.neweratransports.com/email_proxy/api/send-email.php`).