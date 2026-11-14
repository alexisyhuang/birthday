import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { questionnaireSchema } from './questionnaire';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;
export const supabase = url && key ? createClient(url, key) : null;
export const invitationToken = new URLSearchParams(window.location.search).get('token');
const guestSchema = z.object({ guest: z.object({ id: z.string().uuid(), name: z.string() }), rsvp: z.enum(['yes','no']).nullable(), outfit: z.object({ character_id: z.string(), accessory: z.string().nullable() }).nullable(), questionnaire: questionnaireSchema.default({}) });
export type GuestState = z.infer<typeof guestSchema>;

export async function guestRequest<T>(action: string, payload: Record<string, unknown> = {}): Promise<T> {
  if (!supabase || !invitationToken) throw new Error('Personal invitation link is required.');
  const { data, error } = await supabase.functions.invoke('guest-api', { body: { action, token: invitationToken, ...payload } });
  if (error) {
    const context = 'context' in error ? error.context : undefined;
    if (context instanceof Response) {
      try {
        const body = await context.clone().json();
        if (typeof body?.error === 'string') throw new Error(body.error);
      } catch (detail) {
        if (detail instanceof Error && detail.message !== 'Unexpected end of JSON input') throw detail;
      }
      throw new Error(`Guest API returned HTTP ${context.status}.`);
    }
    throw new Error(error.message);
  }
  if (data?.error) throw new Error(String(data.error));
  return data as T;
}
export async function verifyInvitation() {
  return guestSchema.parse(await guestRequest<unknown>('verify'));
}
export const cloudEnabled = Boolean(supabase && invitationToken);
