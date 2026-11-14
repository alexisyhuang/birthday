import { z } from 'zod';

export const questionnaireSchema = z.object({
  annoying_song: z.string().max(1000).optional(),
  holiday_movie: z.string().max(1000).optional(),
  favorite_dessert: z.string().max(1000).optional(),
  regift_item: z.string().max(1000).optional(),
  christmas_association: z.string().max(1000).optional(),
  overrated_restaurant: z.string().max(1000).optional(),
  party_excuse: z.string().max(1000).optional(),
  allie_association: z.string().max(1000).optional(),
  weekday_job_hours: z.number().min(0).max(1000).optional(),
  unread_emails: z.number().min(0).max(1_000_000).optional(),
  unread_texts: z.number().min(0).max(1_000_000).optional(),
  allie_spiritual_age: z.number().min(0).max(1000).optional(),
  name_preference: z.enum(['allie', 'alexis', 'depends']).optional(),
}).strict();

export type QuestionnaireAnswers = z.infer<typeof questionnaireSchema>;

export const questionnaireQuestions = [
  { key: 'annoying_song', label: 'What’s the most annoying Christmas song?' },
  { key: 'holiday_movie', label: 'What’s your favourite holiday movie?' },
  { key: 'favorite_dessert', label: 'What’s your favorite dessert?' },
  { key: 'regift_item', label: 'Name something people re-gift.' },
  { key: 'christmas_association', label: 'Name something that you associate with Christmas.' },
  { key: 'overrated_restaurant', label: 'Name a restaurant that you think is overrated.' },
  { key: 'party_excuse', label: 'You agreed to go to a friend’s holiday party but you no longer want to go… what excuse do you give to the host?' },
  { key: 'allie_association', label: 'Name something that you associate with me (Allie).' },
] as const;
