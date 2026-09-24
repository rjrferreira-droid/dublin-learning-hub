export type LanguageKey = 'english' | 'spanish';

// One course structure for both languages. Authored units, activities and
// assessments are added per language; an empty catalogue never implies a score.
export const LANGUAGE_COURSES = {
  english: { name: 'English', code: 'EN', locale: 'en', status: 'active' },
  spanish: { name: 'Español', code: 'ES', locale: 'es', status: 'preparing' },
} as const;

export const LANGUAGE_UNIT_FLOW = [
  { key: 'Learn', label: 'Learn', description: 'When, why and how each concept works, with connected examples and visual explanations.' },
  { key: 'Audio', label: 'Audio', description: 'A voiced episode with natural pauses, an optional transcript and questions for each concept.' },
  { key: 'Practice', label: 'Practice', description: 'A mix of choice and written answers with feedback and a skill summary.' },
  { key: 'Speaking', label: 'Speaking', description: 'About 20 listen and repeat phrases, with pronunciation feedback.' },
  { key: 'Professor', label: 'Professor', description: 'A one to one conversation to apply the unit in context.' },
] as const;
