# Textcreate Prototype (Demo-ready, View-only Visual Collections)

This prototype is intentionally **not ecommerce checkout**.
Flow: user sends an MMS photo → AI analyzes visuals → AI generates a styled collection page → user gets a view-only link.

## Live Twilio Test Checklist
- [ ] ngrok is running (`ngrok http 3000`)
- [ ] `NEXT_PUBLIC_APP_URL` is set to the ngrok HTTPS URL
- [ ] `PUBLIC_WEBHOOK_BASE_URL` is set to the same ngrok HTTPS URL
- [ ] Twilio inbound webhook is set to:
      `https://<ngrok-id>.ngrok.io/api/twilio/inbound`
- [ ] `DISABLE_TWILIO_SIGNATURE_VALIDATION=false`
- [ ] Twilio number supports MMS
- [ ] `OPENAI_API_KEY` is present
- [ ] `ENABLE_IMAGE_GENERATION=true` (or `false` for analysis-only test)

## Fastest local demo path (`/demo`)
1. `npm install`
2. Copy `.env.example` to `.env.local`
3. `npm run seed`
4. `npm run dev`
5. Open `http://localhost:3000/demo`
6. Click **Generate Demo Collection**
7. Open returned `collectionUrl`

## Real Twilio + ngrok path
1. Start app: `npm run dev`
2. Start ngrok: `ngrok http 3000`
3. Set Twilio phone webhook to:
   - `https://<ngrok-id>.ngrok.io/api/twilio/inbound`
   - Method: `POST`
4. Run `GET https://<ngrok-id>.ngrok.io/api/health` and review warnings.
5. Send an MMS image to Twilio number.
6. You should receive: `Your visual collection is ready: [URL]`

## `.env.local` ngrok example
```env
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_PHONE_NUMBER=+15551234567
OPENAI_API_KEY=sk-...
OPENAI_IMAGE_MODEL=gpt-image-1
ENABLE_IMAGE_GENERATION=true
NEXT_PUBLIC_APP_URL=https://abc123.ngrok.io
PUBLIC_WEBHOOK_BASE_URL=https://abc123.ngrok.io
DISABLE_TWILIO_SIGNATURE_VALIDATION=false
```

## Scripts
- `npm run dev`
- `npm run seed`
- `npm run typecheck`
- `npm run lint`
- `npm run build`

## Demo/Debug endpoints
- `GET /api/health`
- `POST /api/dev/mock-inbound?imageUrl=<optional>&phone=<optional>`
- `GET /api/dev/sessions` (non-production only)

## Troubleshooting
### OpenAI image generation fails
- Confirm `OPENAI_API_KEY` is valid.
- Set `ENABLE_IMAGE_GENERATION=true`.
- Multi-image edit attempts may fail; system falls back to prompt-only generation.

### Twilio signature fails
- Verify `PUBLIC_WEBHOOK_BASE_URL` exactly matches Twilio webhook host.
- Keep `DISABLE_TWILIO_SIGNATURE_VALIDATION=false` for real tests.

### Localhost image URLs are not public
- Twilio/OpenAI cannot fetch `localhost`.
- Use ngrok and set `NEXT_PUBLIC_APP_URL` to ngrok HTTPS.

### Lint/build issues
- Lint runs non-interactively via `eslint .`.
- Reinstall dependencies if plugin resolution fails.

## Known limitations
- JSON file persistence is local/single-instance.
- Generated hero image is best-effort; collection still renders without it.
- Mock collection items/assets are for prototype demo only.

## Twilio Console Setup — Step-by-Step Placeholder

> Manual setup required: Twilio Console must be configured manually before live testing. This project does **not** automate Twilio account/number/webhook provisioning yet.

Complete these manual steps first:
1. Verify your Twilio account (and any trial-account messaging restrictions).
2. Select or buy a phone number that explicitly supports **MMS**.
3. Open Twilio Console → Phone Numbers → your number → Messaging configuration.
4. Configure **A message comes in** webhook to:
   - `https://<ngrok-id>.ngrok.io/api/twilio/inbound` (for local testing)
5. Set webhook method to **POST**.
6. Send a test MMS and review Twilio Messaging logs for webhook delivery status and response codes.
7. Before broader US usage, confirm Twilio **A2P/10DLC** registration and compliance requirements are complete.

Short checklist:
- [ ] Account verified
- [ ] MMS-capable number active
- [ ] Inbound webhook URL configured
- [ ] Webhook method set to POST
- [ ] ngrok URL currently active and reachable
- [ ] Messaging logs checked in Twilio Console
- [ ] A2P/10DLC status reviewed for US traffic

(Exact screenshots and a detailed console walkthrough will be added in a later manual runbook.)

## First Real Twilio MMS Test
1. Start app: `npm run dev`
2. Start ngrok: `ngrok http 3000`
3. Set env vars in `.env.local` (especially `NEXT_PUBLIC_APP_URL`, `PUBLIC_WEBHOOK_BASE_URL`, Twilio creds, OpenAI key).
4. Configure Twilio inbound webhook to `https://<ngrok-id>.ngrok.io/api/twilio/inbound` (POST).
5. Send a real MMS photo to your Twilio number.
6. Expected behavior:
   - immediate acknowledgment SMS: `Got your photo. Building your collection now…`
   - second SMS with final collection link
   - collection page loads with source image + visual matches (hero may be optional)

Troubleshooting:
- No webhook hit: verify ngrok is running and webhook URL is current.
- 403 signature failure: verify `PUBLIC_WEBHOOK_BASE_URL` exactly matches webhook host and `DISABLE_TWILIO_SIGNATURE_VALIDATION=false`.
- Image not downloading: verify Twilio credentials and that `MediaUrl0` is present in Twilio logs.
- OpenAI failing: verify `OPENAI_API_KEY` and inspect app logs for `openai_failed` / `json_parse_failed`.
- Hero image missing: generation can fail independently; collection link should still arrive.
