import type {LocalEnglishCode} from './localEnglishLessonRegistry.ts';

export type MonthlyEnglishStudyDay={
 week:1|2|3|4;
 day:1|2|3|4|5;
 lesson:LocalEnglishCode;
 strand:'everyday'|'technical';
};

export const ENGLISH_MONTH_DIRECTION={
 split:{everydayPct:50,technicalPct:50},
 everydayThemes:['conversation','family','services','food','shopping','news-politics','tv-films','hobbies'] as const,
 technicalDomains:['finance','accounting','tax','legal-compliance','payroll','treasury'] as const,
 dublinRole:'occasional-context-not-curriculum-centre' as const,
} as const;

/** Four five-day weeks. Each authored lesson appears once; the month is exactly 50/50. */
export const ENGLISH_MONTH_PLAN:readonly MonthlyEnglishStudyDay[]=[
 {week:1,day:1,lesson:'E1',strand:'everyday'},
 {week:1,day:2,lesson:'P1',strand:'technical'},
 {week:1,day:3,lesson:'E2',strand:'everyday'},
 {week:1,day:4,lesson:'P2',strand:'technical'},
 {week:1,day:5,lesson:'E3',strand:'everyday'},
 {week:2,day:1,lesson:'P3',strand:'technical'},
 {week:2,day:2,lesson:'E4',strand:'everyday'},
 {week:2,day:3,lesson:'P4',strand:'technical'},
 {week:2,day:4,lesson:'E5',strand:'everyday'},
 {week:2,day:5,lesson:'P5',strand:'technical'},
 {week:3,day:1,lesson:'E6',strand:'everyday'},
 {week:3,day:2,lesson:'P6',strand:'technical'},
 {week:3,day:3,lesson:'E7',strand:'everyday'},
 {week:3,day:4,lesson:'P7',strand:'technical'},
 {week:3,day:5,lesson:'E8',strand:'everyday'},
 {week:4,day:1,lesson:'P8',strand:'technical'},
 {week:4,day:2,lesson:'E9',strand:'everyday'},
 {week:4,day:3,lesson:'P9',strand:'technical'},
 {week:4,day:4,lesson:'E10',strand:'everyday'},
 {week:4,day:5,lesson:'P10',strand:'technical'},
];
