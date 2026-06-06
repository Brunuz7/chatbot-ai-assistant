export function inboundTrace(step: string, data?: Record<string, unknown>): void {
  if (process.env.INBOUND_TRACE === '0') return;
  if (data && Object.keys(data).length > 0) console.log(`[inbound] ${step}`, data);
  else console.log(`[inbound] ${step}`);
}
