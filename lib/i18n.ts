export type Lang = 'en' | 'ko'

const KO: Record<string, string> = {
  // Section headings
  'Today': '오늘',
  'Work Hub': '업무 허브',
  'Daily Habits': '일일 습관',
  'Capture': '메모',
  'Domains': '영역',
  "Today's Pulse": '오늘의 상태',
  'Wishlist': '위시리스트',
  'Recurring Spending': '정기 지출',
  'Calendar': '캘린더',
  'Your Council': '내 조언단',
  // Nav labels
  'Brief': '오늘',
  'Work': '업무',
  'Habits': '습관',
  'Pulse': '상태',
  'Money': '재정',
  'Council': '조언단',
  // Help
  'Help': '도움말',
  'Close': '닫기',
  'Keyboard Shortcuts': '단축키',
  // General
  'sign out': '로그아웃',
  'account': '계정',
}

export function t(key: string, lang: Lang): string {
  if (lang === 'en') return key
  return KO[key] ?? key
}
