import { supabaseAdmin } from './supabase';

export interface DebugLogEntry {
  user_id: string;
  incoming_message: string;
  detected_intent: string;
  pending_action_found: string | null;
  handler_used: string;
  parsed_data: Record<string, any> | null;
  response_sent: string;
  error: string | null;
  processing_time_ms: number;
}

/**
 * Writes a debug log entry to the debug_logs table.
 * Never throws — logging failures are silently caught.
 */
export async function writeDebugLog(entry: DebugLogEntry): Promise<void> {
  try {
    await supabaseAdmin.from('debug_logs').insert([{
      ...entry,
      timestamp: new Date().toISOString(),
    }]);
  } catch (err) {
    console.error('Debug log write failed:', err);
  }
}

/**
 * Helper to create a log context that collects data as the request is processed.
 */
export function createDebugContext(userId: string, incomingMessage: string) {
  const startTime = Date.now();
  const ctx: DebugLogEntry = {
    user_id: userId,
    incoming_message: incomingMessage,
    detected_intent: 'unknown',
    pending_action_found: null,
    handler_used: 'none',
    parsed_data: null,
    response_sent: '',
    error: null,
    processing_time_ms: 0,
  };

  return {
    /** Set the detected intent */
    setIntent(intent: string) { ctx.detected_intent = intent; },
    /** Set pending action info */
    setPending(info: string) { ctx.pending_action_found = info; },
    /** Set which handler processed the message */
    setHandler(handler: string) { ctx.handler_used = handler; },
    /** Set parsed data */
    setParsed(data: Record<string, any>) { ctx.parsed_data = data; },
    /** Set the response that was sent */
    setResponse(response: string) { ctx.response_sent = response; },
    /** Set error info */
    setError(error: string) { ctx.error = error; },
    /** Flush the log to the database */
    async flush() {
      ctx.processing_time_ms = Date.now() - startTime;
      await writeDebugLog(ctx);
    },
  };
}
