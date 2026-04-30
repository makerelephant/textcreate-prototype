import twilio from "twilio";

export async function sendSms(to: string, body: string) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_PHONE_NUMBER;
  if (!sid || !token || !from) return { ok: false, reason: "missing_twilio_env" };
  const client = twilio(sid, token);
  await client.messages.create({ to, from, body });
  return { ok: true };
}
