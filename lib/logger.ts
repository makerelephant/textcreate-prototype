export function logEvent(event: string, meta: Record<string, unknown> = {}) {
  console.log(JSON.stringify({ level: "info", event, ts: new Date().toISOString(), ...meta }));
}

export function logWarn(event: string, meta: Record<string, unknown> = {}) {
  console.warn(JSON.stringify({ level: "warn", event, ts: new Date().toISOString(), ...meta }));
}

export function logError(event: string, meta: Record<string, unknown> = {}) {
  console.error(JSON.stringify({ level: "error", event, ts: new Date().toISOString(), ...meta }));
}
