export type Lang = 'en' | 'ko'

const KO: Record<string, string> = {
  // ── Section headings ────────────────────────────────────────────────
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

  // ── Section nav labels ───────────────────────────────────────────────
  'Brief': '오늘',
  'Work': '업무',
  'Habits': '습관',
  'Pulse': '상태',
  'Money': '재정',
  'Council': '조언단',

  // ── Section groups ───────────────────────────────────────────────────
  'at a glance': '한눈에',
  'focus': '집중',
  'inbox': '받은 메모',
  'check-in': '상태 확인',
  'money': '재정',
  'review': '검토',

  // ── Domain names ─────────────────────────────────────────────────────
  'Business (Active)': '사업 (진행)',
  'Business (Future)': '사업 (미래)',
  'Health': '건강',
  'Relationship': '관계',
  'Creative': '창작',
  'Home': '가정',
  'Self': '자기계발',
  'No domain — inbox': '영역 없음 — 받은함',
  '◈ Business (Active)': '◈ 사업 (진행)',
  '◇ Business (Future)': '◇ 사업 (미래)',
  '◉ Money': '◉ 재정',
  '○ Health': '○ 건강',
  '♡ Relationship': '♡ 관계',
  '✦ Creative': '✦ 창작',
  '⌂ Home': '⌂ 가정',
  '◎ Self': '◎ 자기계발',
  'Assign to…': '영역 선택…',
  'assign': '분류',
  '+ domain': '+ 영역',

  // ── Quick Capture ─────────────────────────────────────────────────────
  'quick capture — ⌘K': '빠른 메모 — ⌘K',
  "What's on your mind?": '무슨 생각을 하고 있나요?',
  'Save ↵': '저장 ↵',
  'captured ✓': '저장됨 ✓',

  // ── Capture section ───────────────────────────────────────────────────
  'Dump a thought — assign it later': '생각을 적어보세요 — 나중에 분류하세요',
  '↵ enter': '↵ 입력',
  'Unsorted': '미분류',
  '⬤ Unsorted': '⬤ 미분류',
  'Nothing captured yet': '아직 메모가 없습니다',
  'No results': '결과 없음',

  // ── Habits ────────────────────────────────────────────────────────────
  'Streaks': '연속 기록',
  'cancel': '취소',
  '+ add habit': '+ 습관 추가',
  'No habits yet. Add one to start building streaks.': '습관이 없습니다. 추가하여 연속 기록을 시작하세요.',
  'Habit name (e.g. Walk, Journal)': '습관 이름 (예: 운동, 일기)',
  'No category': '분류 없음',
  'Add': '추가',

  // ── Work Hub ──────────────────────────────────────────────────────────
  'all': '전체',
  'today': '오늘',
  'overdue': '기한 초과',
  'done': '완료',
  'No tasks yet': '업무가 없습니다',
  '+ add task': '+ 업무 추가',
  '+ Add a task': '+ 업무 추가',
  'New task title': '새 업무 제목',
  'Notes (optional)': '메모 (선택)',
  'Due date': '마감일',
  'Priority': '우선순위',
  'Domain': '영역',
  'Repeat': '반복',
  'No repeat': '반복 없음',
  'Daily': '매일',
  'Every 3 days': '3일마다',
  'Weekly': '매주',
  'Biweekly': '격주',
  'Monthly': '매월',
  'Add task': '업무 추가',
  '+ add notes': '+ 메모 추가',
  'Add notes, links, context…': '메모, 링크, 내용 추가…',
  'In progress': '진행 중',
  'No tasks match this filter.': '해당 필터의 업무가 없습니다.',

  // ── Daily Brief ───────────────────────────────────────────────────────
  'overdue (stat)': '기한 초과',
  'due today': '오늘 마감',
  'in progress': '진행 중',
  'in inbox': '미분류',
  'habits today': '오늘 습관',
  'Nothing urgent. A good day to build.': '긴급한 사항 없습니다. 좋은 날이에요.',

  // ── Week Review ───────────────────────────────────────────────────────
  'Week in Review': '주간 검토',
  'Week of': '주간',
  'tasks done': '완료된 업무',
  'ideas captured': '포착된 아이디어',
  'Most active:': '가장 활발:',
  'd streak': '일 연속',

  // ── Pulse ─────────────────────────────────────────────────────────────
  'On your mind': '마음속에 있는 것',
  'Quietly becoming a problem': '서서히 문제가 되는 것',
  'Nothing flagged': '표시된 항목 없음',
  'All clear': '문제 없음',

  // ── Focus Mode ────────────────────────────────────────────────────────
  'start': '시작',
  'pause': '일시정지',
  'reset': '초기화',
  'Session complete — great work.': '세션 완료 — 잘 하셨어요.',
  'go again': '다시',
  'Working on': '작업 중',
  'Building': '형성 중',
  'Pick a task…': '업무 선택…',
  'Pick a habit…': '습관 선택…',
  'min': '분',

  // ── Archive ───────────────────────────────────────────────────────────
  'Archive': '보관함',
  'Completed & cancelled work': '완료 및 취소된 업무',
  'cancelled': '취소됨',
  'Loading…': '로딩 중…',
  'Nothing archived yet.': '아직 보관된 항목이 없습니다.',
  'Complete tasks to see them here.': '업무를 완료하면 여기에 표시됩니다.',

  // ── Search ────────────────────────────────────────────────────────────
  'Search everything…': '전체 검색…',
  'Search captures, work items, wishlist, habits…': '메모, 업무, 위시리스트, 습관 검색…',
  'navigate': '이동',
  'jump to': '열기',
  'close': '닫기',
  'capture': '메모',
  'work': '업무',
  'wishlist': '위시리스트',
  'habit': '습관',

  // ── Feedback ──────────────────────────────────────────────────────────
  'suggestions & feedback': '제안 및 피드백',
  'Share an idea or report something →': '아이디어를 공유하거나 문제를 보고해주세요 →',
  'Got it — thank you ✓': '감사합니다 ✓',
  'cancel (btn)': '취소',
  'send': '전송',
  'sending…': '전송 중…',
  'What would make 4S better? Bug, feature idea, anything…': '4S를 더 좋게 만들 방법은? 버그, 기능 아이디어 등...',
  'I read every message.': '모든 메시지를 읽습니다.',

  // ── Subscriptions / Money ─────────────────────────────────────────────
  'Renewals': '정기 결제',
  '/ mo': '/ 월',
  'No subscriptions added yet.': '아직 구독이 없습니다.',
  'Name': '이름',
  'Cost/mo': '월 비용',
  'Renewal date': '갱신일',
  'Add renewal': '추가',

  // ── Wishlist ──────────────────────────────────────────────────────────
  'Wishlist (card)': '위시리스트',
  'No items yet.': '항목이 없습니다.',
  'Add item': '추가',

  // ── Theme/Mode picker ─────────────────────────────────────────────────
  'Theme': '테마',
  'Mode': '모드',
  'theme + mode stack — mix freely': '테마 + 모드 — 자유롭게 조합',

  // ── Customize panel ────────────────────────────────────────────────────
  'Customize': '맞춤 설정',
  'Layout': '레이아웃',
  'Drag to reorder': '드래그하여 순서 변경',

  // ── Companion panel ────────────────────────────────────────────────────
  'Companions': '동반자',
  'What I Share': '내가 공유하는 것',
  'Add companion': '동반자 추가',

  // ── Header / General ──────────────────────────────────────────────────
  'Help': '도움말',
  'sign out': '로그아웃',
  'account': '계정',
  'mode': '모드',

  // ── Mode greetings ────────────────────────────────────────────────────
  'Good morning': '좋은 아침이에요',
  'Good afternoon': '좋은 오후예요',
  'Good evening': '좋은 저녁이에요',
  'Good night': '좋은 밤이에요',
  'Wake up': '일어나세요',
  'Still at it': '아직도 하고 있네요',
  'End strong': '마무리 잘 하세요',
  'Still up': '아직 안 주무세요?',
  'Rest easy': '편히 쉬세요',
  'Welcome back': '다시 오셨군요',
  "Let's go": '시작해봐요',
  'Keep pushing': '계속 해봐요',
  'Finish strong': '마무리 잘 해요',
  'Rest up': '푹 쉬세요',
  'Be present': '현재에 집중하세요',
  'Rest now': '지금은 쉬세요',
  'New day, new quests': '새로운 날, 새로운 퀘스트',
  'Mid-session': '세션 진행 중',
  'Final boss hour': '마지막 보스 타임',
  'Night grind': '밤 그라인드',
  '— ready to reflect?': '— 돌아볼 준비 됐나요?',
  'Morning': '좋은 아침,',
  'Hey': '안녕하세요,',
  'Evening': '좋은 저녁,',
}

export function t(key: string, lang: Lang): string {
  if (lang === 'en') return key
  return KO[key] ?? key
}

/** Translate domain IDs to labels */
export function domainLabel(id: string, lang: Lang): string {
  const EN: Record<string, string> = {
    'biz-active': 'Business (Active)', 'biz-future': 'Business (Future)',
    money: 'Money', health: 'Health', relationship: 'Relationship',
    creative: 'Creative', home: 'Home', self: 'Self',
  }
  const KO_MAP: Record<string, string> = {
    'biz-active': '사업 (진행)', 'biz-future': '사업 (미래)',
    money: '재정', health: '건강', relationship: '관계',
    creative: '창작', home: '가정', self: '자기계발',
  }
  const label = lang === 'ko' ? KO_MAP[id] : EN[id]
  return label ?? id
}

/** Format a date per locale */
export function fmtDate(date: Date, lang: Lang): string {
  if (lang === 'ko') {
    const y = date.getFullYear()
    const m = date.getMonth() + 1
    const d = date.getDate()
    const days = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일']
    const day = days[date.getDay()]
    return `${y}년 ${m}월 ${d}일 ${day}`
  }
  // default handled by date-fns in Header
  return ''
}

/** Korean insight strings (DailyBrief) */
export function getInsightKO(params: {
  overdue: number; dueToday: number; habitsDoneToday: number; habitsTotal: number;
  inboxCount: number; inProgress: number;
}): string {
  const { overdue, dueToday, habitsDoneToday, habitsTotal, inboxCount, inProgress } = params
  if (overdue > 0) return `${overdue}개 업무 기한이 지났습니다 — 먼저 처리하세요.`
  if (dueToday > 0 && habitsDoneToday === 0 && habitsTotal > 0) return `오늘 마감 업무 ${dueToday}개, 아직 습관 미완료.`
  if (habitsTotal > 0 && habitsDoneToday === habitsTotal) return '오늘 습관 모두 완료. 훌륭한 하루입니다.'
  if (inboxCount > 5) return `미분류 메모 ${inboxCount}개 — 잠깐 정리해보세요.`
  if (inProgress > 0) return `진행 중인 업무 ${inProgress}개. 계속 이어가세요.`
  if (dueToday === 0 && overdue === 0 && habitsTotal > 0) return '오늘 여유 있습니다. 깊이 집중할 좋은 시간이에요.'
  return '가장 중요한 것부터 시작하세요.'
}

/** Korean week review */
export function fmtWeekOf(date: Date): string {
  const m = date.getMonth() + 1
  const d = date.getDate()
  return `${m}월 ${d}일 주간`
}
