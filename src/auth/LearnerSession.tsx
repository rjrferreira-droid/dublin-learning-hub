import { createContext, useContext } from 'react';
import type { AccountLearnerKey } from './identity';

export type LearnerSession = { userId: string; learnerKey: AccountLearnerKey };
export const LearnerSessionContext = createContext<LearnerSession | null>(null);

export function useLearnerSession(): LearnerSession {
  const account = useContext(LearnerSessionContext);
  if (!account) throw new Error('Authenticated learner profile is required.');
  return account;
}
