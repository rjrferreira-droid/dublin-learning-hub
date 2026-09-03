import { expect, test } from '@playwright/test';
import { isProfessorTrackAllowed, requiresPublishedTechnicalLesson } from '../src/professor/accessPolicy';

test('Rafael can access Finance and shared English Academy but not Viviane Payroll', () => {
  expect(isProfessorTrackAllowed('rafael_finance', 'rafael_finance')).toBe(true);
  expect(isProfessorTrackAllowed('rafael_finance', 'english_academy')).toBe(true);
  expect(isProfessorTrackAllowed('rafael_finance', 'viviane_payroll')).toBe(false);
});

test('Viviane can access Payroll and shared English Academy but not Rafael Finance', () => {
  expect(isProfessorTrackAllowed('viviane_payroll', 'viviane_payroll')).toBe(true);
  expect(isProfessorTrackAllowed('viviane_payroll', 'english_academy')).toBe(true);
  expect(isProfessorTrackAllowed('viviane_payroll', 'rafael_finance')).toBe(false);
});

test('unknown or missing profiles receive no Professor track access', () => {
  expect(isProfessorTrackAllowed(null, 'english_academy')).toBe(false);
  expect(isProfessorTrackAllowed('other', 'rafael_finance')).toBe(false);
});

test('technical Professor sessions require a published lesson while English Academy may stage a Golden Lesson placeholder', () => {
  expect(requiresPublishedTechnicalLesson('rafael_finance')).toBe(true);
  expect(requiresPublishedTechnicalLesson('viviane_payroll')).toBe(true);
  expect(requiresPublishedTechnicalLesson('english_academy')).toBe(false);
});
