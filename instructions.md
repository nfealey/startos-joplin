# Joplin Server Setup Instructions

## Initial Setup

1. Start the Joplin Server service and wait for it to report **Ready**.
2. Run the **Show Admin Login** action to view your admin credentials. A unique
   password is generated for you at install (replacing Joplin's default), so
   there is no shared default to change.
3. Open the **Joplin Server** web interface from the StartOS dashboard.
4. Log in with:
   - **Email**: `admin@localhost`
   - **Password**: the value from **Show Admin Login**
5. You can change the password anytime from the Joplin profile button (top
   right).

## Connecting a Joplin Client

In any Joplin app (desktop, mobile, or CLI):

1. Go to **Settings → Synchronisation**.
2. Set **Synchronisation target** to **Joplin Server (Beta)**.
3. Configure:
   - **Joplin Server URL**: the URL from the StartOS "Joplin Server" interface
   - **Email**: your Joplin Server login email
   - **Password**: your Joplin Server password
4. Click **Check synchronisation configuration** to verify, then sync.

Repeat on each device using the same account to sync notes across them.

### Access address: pick ONE (domain **or** LAN, not both)

Joplin only accepts a single base URL and rejects any request whose host does
not match it exactly ("Invalid origin"), with no way to allow multiple hosts.
So this package uses **one** address at a time:

- **If you have mapped a clearnet domain** to the service, the package uses that
  domain. Open the web UI and point all sync clients at the **domain**
  (`https://your-domain`). The LAN `.local` address will report "Invalid origin"
  and will not work. Upside: a real (Let's Encrypt) certificate, so clients work
  without the "Ignore TLS" workaround — but the service is exposed to the
  internet.
- **If you have no domain**, the package uses the LAN **`.local`** address. Use
  `.local` everywhere (clients need "Ignore TLS certificate errors" — see
  below). The service stays on your local network.

You cannot use the `.local` address and a domain at the same time.

### TLS certificate

StartOS serves this interface over HTTPS using its own self-signed Root CA, so
Joplin clients will reject the connection with a "self signed certificate"
error until the certificate is trusted. Options:

- **Quick (trusted LAN only)**: in Joplin → Settings → Synchronisation →
  Advanced settings, enable **"Ignore TLS certificate errors."**
- **Tor**: sync over the interface's `.onion` address instead — onion services
  are self-authenticating, so there is no TLS certificate to trust.

Note: installing the StartOS Root CA on your device makes the certificate valid
in your **browser** (so the web UI loads cleanly), but Joplin's sync engine
validates TLS with Node's own certificate store rather than the OS trust store,
so the desktop/mobile sync client still needs "Ignore TLS certificate errors"
(or the Tor address) even with the CA installed.

## Notes

- All note data is stored in the bundled PostgreSQL database and is included in
  StartOS backups.
- Joplin Server is intended for personal, non-commercial use (see its license).
