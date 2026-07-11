/* ── UX Work Dashboard ── */

const STATUS_COLORS = {
  'done':        'seg-done',
  'md-fix':      'seg-md-fix',
  'spec-fix':    'seg-spec-fix',
  'in-progress': 'seg-in-progress',
  'todo':        'seg-todo',
  'icebox':      'seg-icebox',
  'other':       'seg-todo',
};

const STATUS_LABELS = {
  'done':        'Done',
  'md-fix':      'MD Updated',
  'spec-fix':    'Spec Fixed',
  'in-progress': 'In Progress',
  'todo':        'Todo',
  'icebox':      'Icebox',
  'other':       'Other',
};

const STATUS_ORDER = ['done', 'md-fix', 'spec-fix', 'in-progress', 'todo', 'icebox', 'other'];

const UX_MEMBERS = ['min-kyungeun', 'hhdeunj1', 'yunahyeon', 'Yeongyeon-Lee', 'ckksong'];

// 미팅 스케줄 (day: 0=일 1=월 2=화 3=수 4=목 5=금 6=토)
const MEETINGS = [
  {
    id: 'ux-design-sync',
    name: '서비스UX-디자인 sync',
    emoji: '🎨',
    day: 1,
    biweekly: false,
    repos: ['shucle-rider'],
  },
  {
    id: 'platform-sync',
    name: '플랫폼 UX sync',
    emoji: '🔧',
    day: 1,
    biweekly: true,
    biweeklyEvenWeek: true, // 짝수 주 (홀수로 바꾸려면 false)
    repos: ['shucle-product', 'shucle-registry', 'shucle-ux'],
  },
  {
    id: 'rider-scrum',
    name: '라이더앱 스크럼',
    emoji: '🏍',
    day: 3,
    repos: ['shucle-rider'],
  },
  {
    id: 'leader-weekly',
    name: '리더 위클리',
    emoji: '📊',
    day: 4,
    repos: null,
  },
];

function getISOWeek(date) {
  const d = new Date(date);
  d.setHours(0,0,0,0);
  d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
  const week1 = new Date(d.getFullYear(), 0, 4);
  return 1 + Math.round(((d - week1) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
}

function isMeetingToday(meeting) {
  const today = new Date();
  if (today.getDay() !== meeting.day) return false;
  if (!meeting.biweekly) return true;
  const week = getISOWeek(today);
  return meeting.biweeklyEvenWeek ? week % 2 === 0 : week % 2 === 1;
}

function getTodayMeetings() {
  return MEETINGS.filter(isMeetingToday);
}

let milestonesConfig = null;
let issuesData = null;
let currentMilestone = null;

// ── 데이터 로드 ──────────────────────────────────────────
async function loadAll() {
  try {
    const [cfgRes, dataRes] = await Promise.all([
      fetch('config/milestones.json'),
      fetch('data/issues.json'),
    ]);
    milestonesConfig = await cfgRes.json();
    issuesData       = await dataRes.json();
    init();
  } catch (e) {
    document.body.innerHTML = `<div class="error-msg">⚠ 데이터 로드 실패: ${e.message}</div>`;
  }
}

function init() {
  buildMilestoneSelect();
  currentMilestone = milestonesConfig.current;
  document.getElementById('milestoneSelect').value = currentMilestone;
  renderAll();

  document.getElementById('milestoneSelect').addEventListener('change', e => {
    currentMilestone = e.target.value;
    renderAll();
  });
  document.getElementById('refreshBtn').addEventListener('click', () => location.reload());
}

// ── 마일스톤 셀렉터 ──────────────────────────────────────
function buildMilestoneSelect() {
  const sel = document.getElementById('milestoneSelect');
  for (const [key] of Object.entries(milestonesConfig.milestones)) {
    const opt = document.createElement('option');
    opt.value = key;
    opt.textContent = key;
    sel.appendChild(opt);
  }
}

// ── 전체 렌더 ─────────────────────────────────────────────
// ── GitHub 알림 ───────────────────────────────────────────
function renderNotifications() {
  const el = document.getElementById('notifBar');
  const notifs = issuesData.notifications || [];

  const REASON_LABEL = {
    mention:           'mention',
    review_requested:  'review',
    assign:            'assign',
    author:            'author',
    comment:           'comment',
    subscribed:        'subscribed',
  };

  const items = notifs.map(n => {
    const reasonKey = REASON_LABEL[n.reason] ? n.reason : 'other';
    const reasonClass = ['mention','review_requested','assign'].includes(n.reason)
      ? (n.reason === 'mention' ? 'mention' : n.reason === 'review_requested' ? 'review' : 'assign')
      : 'other';
    const repoShort = n.repo.replace('hkmc-airlab/', '');
    return `<div class="notif-item">
      <span class="notif-repo">${repoShort}</span>
      <a class="notif-title" href="${n.web_url}" target="_blank" title="${n.title}">${n.title}</a>
      <span class="notif-reason ${reasonClass}">${REASON_LABEL[n.reason] || n.reason}</span>
    </div>`;
  }).join('');

  const updatedAt = issuesData.generated_at
    ? new Date(issuesData.generated_at).toLocaleTimeString('ko-KR', { hour:'2-digit', minute:'2-digit' })
    : '';

  el.innerHTML = `
    <span class="notif-bar-label">🔔 알림</span>
    <div class="notif-list">${items || '<span style="color:var(--ink-48);font-size:12px">새 알림 없음</span>'}</div>
    <a class="notif-all-btn" href="https://github.com/notifications" target="_blank">전체 보기 →</a>`;
}

function renderAll() {
  const cfg   = milestonesConfig.milestones[currentMilestone];
  const msKey = cfg ? cfg.github_milestone : currentMilestone;

  // UX 보드 링크 (마일스톤 슬라이스)
  const boardLink = document.getElementById('boardLink');
  if (boardLink && msKey) {
    boardLink.href = `https://github.com/orgs/hkmc-airlab/projects/59/views/11?sliceBy%5Bvalue%5D=${encodeURIComponent(msKey)}`;
  }

  renderNotifications();
  renderLastUpdated();
  renderWeekStrip();          // 전체 마일스톤 날짜 합산
  renderAlertsPanel();        // 전체 마일스톤 날짜 합산
  renderProducts('milestoneProducts', issuesData.milestone_products, msKey);
  renderMemberOverview(msKey);
  renderProducts('alwaysOnProducts',  issuesData.always_on_products, null);
}

// ── Week Strip ────────────────────────────────────────────
const DAY_NAMES = ['일','월','화','수','목','금','토'];

function getWeekDays() {
  const today = new Date(); today.setHours(0,0,0,0);
  const dow = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1) + _weekOffset * 7);
  return Array.from({ length: 5 }, (_, i) => {
    const d = new Date(monday); d.setDate(monday.getDate() + i);
    return d;
  });
}

function getDayAlerts(date) {
  const alerts = [];
  for (const { ms, label, date: dateStr } of getAllMilestoneDates()) {
    const deadline = new Date(dateStr); deadline.setHours(0,0,0,0);
    const diff = Math.round((deadline - date) / 86400000);
    if (diff === 0)
      alerts.push({ type: 'deadline-danger', text: `[${ms}] ${label}` });
  }
  return alerts;
}

function getMeetingsForDate(date) {
  return MEETINGS.filter(m => {
    if (m.day !== date.getDay()) return false;
    if (!m.biweekly) return true;
    const week = getISOWeek(date);
    return m.biweeklyEvenWeek ? week % 2 === 0 : week % 2 === 1;
  });
}

let _selectedDay = null;
let _weekOffset  = 0;   // 0 = 이번 주, -1 = 지난 주, +1 = 다음 주

function shiftWeek(delta) {
  if (delta === 0) { _weekOffset = 0; }  // 오늘 버튼
  else             { _weekOffset += delta; }
  renderWeekStrip();
  // 이동한 주의 첫 날(월)로 랜딩, 오늘이 해당 주에 있으면 오늘로
  const days  = getWeekDays();
  const today = new Date(); today.setHours(0,0,0,0);
  const todayInWeek = days.find(d => d.getTime() === today.getTime());
  selectDay((todayInWeek || days[0]).getTime());
}

function renderWeekStrip() {
  const days  = getWeekDays();
  const today = new Date(); today.setHours(0,0,0,0);

  document.getElementById('weekStrip').innerHTML = days.map(date => {
    const isToday   = date.getTime() === today.getTime();
    const meetings  = getMeetingsForDate(date);
    const alerts    = getDayAlerts(date);
    const hasDanger = alerts.some(a => a.type === 'deadline-danger');
    const hasWarn   = alerts.some(a => a.type === 'deadline-warning');

    const badges = [
      ...meetings.map(m => `<span class="day-badge meeting">${m.emoji} ${m.name}</span>`),
      ...alerts.map(a => `<span class="day-badge ${a.type}">${a.text}</span>`),
    ].join('');

    const cls = [
      'day-card',
      isToday ? 'today' : '',
      hasDanger ? 'has-danger' : hasWarn ? 'has-warning' : '',
    ].filter(Boolean).join(' ');

    return `<div class="${cls}" onclick="selectDay(${date.getTime()})">
      <div class="day-name">${DAY_NAMES[date.getDay()]}요일</div>
      <div class="day-date">${date.getMonth()+1}/${date.getDate()}</div>
      <div class="day-badges">${badges}</div>
    </div>`;
  }).join('');

  // 주 라벨 (7/7 ~ 7/11 형식)
  const labelEl = document.getElementById('weekLabel');
  if (labelEl) {
    const mon = days[0], fri = days[4];
    const fmt = d => `${d.getMonth()+1}/${d.getDate()}`;
    const isThisWeek = _weekOffset === 0;
    labelEl.textContent = isThisWeek ? '이번 주' : `${fmt(mon)} ~ ${fmt(fri)}`;
  }

  // 미팅 버튼
  const _cfg   = milestonesConfig.milestones[currentMilestone];
  const _msKey = _cfg ? _cfg.github_milestone : currentMilestone;
  document.getElementById('meetingBtn').onclick = () => openMeetingModal(_cfg, _msKey);

  // 오늘로 랜딩
  selectDay(today.getTime());
}

function selectDay(ts) {
  _selectedDay = new Date(ts);
  document.querySelectorAll('.day-card').forEach((el, i) => {
    el.classList.toggle('active', getWeekDays()[i]?.getTime() === ts);
  });
  renderDayDetail(_selectedDay);
}

function renderDayDetail(date) {
  const meetings = getMeetingsForDate(date);

  if (!meetings.length) {
    document.getElementById('dayDetail').innerHTML = `<div class="day-detail-empty">미팅 없음</div>`;
    return;
  }

  document.getElementById('dayDetail').innerHTML = `<div class="focus-items">${
    meetings.map(m => `<div class="focus-item info">
      ${m.emoji} <strong>${m.name}</strong>
      &nbsp;<a href="#" onclick="openMeetingById('${m.id}');return false;"
        style="color:var(--blue);text-decoration:underline;font-size:11px">자료 보기</a>
    </div>`).join('')
  }</div>`;
}

// ── 미팅 자료 ─────────────────────────────────────────────
let _meetingCfg = null, _meetingMsKey = null;

function openMeetingModal(cfg, msKey) {
  _meetingCfg = cfg; _meetingMsKey = msKey;
  buildMeetingTabs();
  // 오늘 미팅이 있으면 해당 탭, 없으면 첫 번째 탭
  const todayIds = getTodayMeetings().map(m => m.id);
  const defaultId = todayIds.length ? todayIds[0] : MEETINGS[0].id;
  selectMeetingTab(defaultId);
  document.getElementById('meetingModal').style.display = 'flex';
}

function openMeetingById(id) {
  const cfg   = milestonesConfig.milestones[currentMilestone];
  const msKey = cfg ? cfg.github_milestone : currentMilestone;
  _meetingCfg = cfg; _meetingMsKey = msKey;
  buildMeetingTabs();
  selectMeetingTab(id);
  document.getElementById('meetingModal').style.display = 'flex';
}

function buildMeetingTabs() {
  const todayIds = getTodayMeetings().map(m => m.id);
  document.getElementById('meetingTabs').innerHTML = MEETINGS.map(m => {
    const isToday = todayIds.includes(m.id);
    const todayCls = isToday ? 'today-meeting' : '';
    const todayDot = isToday ? ' 🟢' : '';
    return `<button class="meeting-tab ${todayCls}" data-id="${m.id}" onclick="selectMeetingTab('${m.id}')">
      ${m.emoji} ${m.name}${todayDot}
    </button>`;
  }).join('');
}

function selectMeetingTab(id) {
  document.querySelectorAll('.meeting-tab').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.id === id);
  });
  const meeting = MEETINGS.find(m => m.id === id);
  document.getElementById('meetingContent').textContent = generateMeetingContent(meeting, _meetingCfg, _meetingMsKey);
}

function closeMeeting() {
  document.getElementById('meetingModal').style.display = 'none';
}

function copyMeeting() {
  const text = document.getElementById('meetingContent').textContent;
  navigator.clipboard.writeText(text).then(() => {
    const btn = document.querySelector('#meetingModal .save');
    btn.textContent = '✓ 복사됨';
    setTimeout(() => btn.textContent = '클립보드 복사', 1500);
  });
}

document.addEventListener('click', e => {
  if (e.target.id === 'meetingModal') closeMeeting();
});

// ── 미팅별 자료 생성 ──────────────────────────────────────
function generateMeetingContent(meeting, cfg, msKey) {
  const today = new Date().toLocaleDateString('ko-KR', { year:'numeric', month:'long', day:'numeric', weekday:'long' });
  switch (meeting.id) {
    case 'ux-design-sync':  return genUXDesignSync(today, cfg, msKey);
    case 'platform-sync':   return genPlatformSync(today, cfg, msKey);
    case 'rider-scrum':     return genRiderScrum(today, cfg, msKey);
    case 'leader-weekly':   return genLeaderWeekly(today, cfg, msKey);
    default: return '';
  }
}

function pad(str, len) { return String(str).padEnd(len); }

function getMsIssuesByRepo(repoKeys, msKey) {
  const allRepos = { ...issuesData.milestone_products, ...issuesData.always_on_products };
  const result = {};
  for (const key of repoKeys) {
    const repo = allRepos[key];
    if (!repo) continue;
    result[key] = { ...repo, issues: msKey ? repo.issues.filter(i => i.milestone === msKey) : repo.issues };
  }
  return result;
}

function memberLine(issues, login) {
  const mine = issues.filter(i => (i.assignees||[]).some(a => a.login === login));
  if (!mine.length) return `  • ${pad(login,16)} 배정 없음`;
  const c = countStatuses(mine);
  const pct = Math.round((c.done||0) / mine.length * 100);
  let line = `  • ${pad(login,16)} ${pct}% (전체 ${mine.length}개`;
  if (c['spec-fix'])    line += ` | Spec Fix ${c['spec-fix']}`;
  if (c['md-fix'])      line += ` | MD Fix ${c['md-fix']}`;
  if (c['in-progress']) line += ` | In Progress ${c['in-progress']}`;
  if (c['todo'])        line += ` | Todo ${c['todo']}`;
  return line + ')';
}

function deadlineBlock(cfg) {
  if (!cfg?.dates) return '  일정 정보 없음';
  return Object.entries(TIMELINE_LABELS).map(([key, label]) => {
    const d = cfg.dates[key]; if (!d) return null;
    const diff = dayDiff(d);
    const tag = diff < 0 ? `D+${-diff} 지연` : diff === 0 ? 'D-Day' : `D-${diff}`;
    return `  • ${pad(label,14)} ${d}  (${tag})`;
  }).filter(Boolean).join('\n');
}

// 🎨 서비스UX-디자인 sync — Rider 중심
function genUXDesignSync(today, cfg, msKey) {
  const riderRepo = issuesData.milestone_products['shucle-rider'];
  const issues = riderRepo ? (msKey ? riderRepo.issues.filter(i => i.milestone === msKey) : riderRepo.issues) : [];
  const c = countStatuses(issues);
  const pct = issues.length ? Math.round((c.done||0)/issues.length*100) : 0;

  const memberSection = UX_MEMBERS.map(l => memberLine(issues, l)).join('\n');

  const specFixItems = issues.filter(i => i.status === 'spec-fix').slice(0,5)
    .map(i => `    - [#${i.number}] ${i.title}`).join('\n') || '    없음';
  const mdFixItems = issues.filter(i => i.status === 'md-fix').slice(0,5)
    .map(i => `    - [#${i.number}] ${i.title}`).join('\n') || '    없음';

  return `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎨 서비스UX-디자인 sync  ${today}
마일스톤 ${currentMilestone}  |  Rider 앱 중심
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

【 Rider 전체 현황 】
  완료율 ${pct}%  (Done ${c.done||0} / 전체 ${issues.length}개)
  Spec Fix ${c['spec-fix']||0}개 · MD Fix ${c['md-fix']||0}개 · In Progress ${c['in-progress']||0}개

【 담당자별 현황 】
${memberSection}

【 Spec Fix 주요 항목 (최대 5개) 】
${specFixItems}

【 MD Fix 주요 항목 (최대 5개) 】
${mdFixItems}

【 주요 일정 】
${deadlineBlock(cfg)}

【 논의 필요 사항 】
  (직접 추가)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
}

// 🏍 라이더앱 스크럼
function genRiderScrum(today, cfg, msKey) {
  const riderRepo = issuesData.milestone_products['shucle-rider'];
  const issues = riderRepo ? (msKey ? riderRepo.issues.filter(i => i.milestone === msKey) : riderRepo.issues) : [];
  const c = countStatuses(issues);
  const pct = issues.length ? Math.round((c.done||0)/issues.length*100) : 0;

  const inProgress = issues.filter(i => i.status === 'in-progress')
    .map(i => `    - [#${i.number}] ${i.title}`).join('\n') || '    없음';
  const blocked = issues.filter(i => ['spec-fix','md-fix'].includes(i.status)).slice(0,5)
    .map(i => `    - [#${i.number}] ${i.title} (${STATUS_LABELS[i.status]})`).join('\n') || '    없음';
  const todo = issues.filter(i => i.status === 'todo').slice(0,5)
    .map(i => `    - [#${i.number}] ${i.title}`).join('\n') || '    없음';

  const memberSection = UX_MEMBERS.map(l => memberLine(issues, l)).join('\n');

  return `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏍 라이더앱 스크럼  ${today}
마일스톤 ${currentMilestone}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

【 Rider 진행 현황 】
  완료율 ${pct}%  (Done ${c.done||0} / 전체 ${issues.length}개)

【 담당자별 현황 】
${memberSection}

【 진행 중 】
${inProgress}

【 검토 대기 (Spec/MD Fix) 】
${blocked}

【 시작 예정 (Todo) 】
${todo}

【 주요 일정 】
${deadlineBlock(cfg)}

【 이슈 / 블로커 】
  (직접 추가)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
}

// 📊 리더 위클리 — 이번 주 업데이트 이슈 전체 리스트업
function genLeaderWeekly(today, cfg, msKey) {
  const allMsIssues = [];
  for (const repo of Object.values(issuesData.milestone_products)) {
    const issues = msKey ? repo.issues.filter(i => i.milestone === msKey) : repo.issues;
    allMsIssues.push(...issues);
  }

  // ── 주요 업무 자동 생성 ──
  const totalDone    = allMsIssues.filter(i => i.status === 'done').length;
  const totalSpecFix = allMsIssues.filter(i => i.status === 'spec-fix').length;
  const totalMdFix   = allMsIssues.filter(i => i.status === 'md-fix').length;
  const totalAll     = allMsIssues.filter(i => i.status !== null).length;
  const pctAll       = totalAll ? Math.round(totalDone / totalAll * 100) : 0;

  const pastSpecFix = cfg?.dates?.spec_fix && new Date() > new Date(cfg.dates.spec_fix);
  const pastMdFix   = cfg?.dates?.md_fix   && new Date() > new Date(cfg.dates.md_fix);

  let keyWork = `- ${currentMilestone} 마일스톤 기획 전체 완료율 ${pctAll}% (Done ${totalDone} / ${totalAll}개)\n`;
  if (totalSpecFix) keyWork += `- Spec Fixed 대기 ${totalSpecFix}개 — MD Fix 전환 진행 중\n`;
  if (totalMdFix)   keyWork += `- MD Updated 진행 중 ${totalMdFix}개\n`;
  if (cfg?.dates) {
    for (const [key, label] of Object.entries(TIMELINE_LABELS)) {
      const d = cfg.dates[key]; if (!d) continue;
      const diff = dayDiff(d);
      if (diff >= 0 && diff <= 7) keyWork += `- ${label} 마감 D-${diff} (${d})\n`;
      if (diff < 0) keyWork += `- ${label} 마감 경과 D+${-diff} (${d})\n`;
    }
  }

  // ── 프로덕트별 > 마일스톤별 이번 주 업데이트 이슈 ──
  const recentData = issuesData.recent_updates || {};
  const REPO_DISPLAY = {
    'shucle-rider':                 'Rider',
    'shucle-DriverVehicle-product': 'Driver',
    'shucle-taxidriver-product':    'Taxi Driver',
    'shucle-kiosk':                 'Kiosk',
    'shucle-CallAgent-product':     'Call Agent',
    'shucle-product':               'Product',
    'shucle-registry':              'Registry',
    'shucle-ux':                    'UX',
  };

  let issueSection = '';
  for (const [repoKey, displayName] of Object.entries(REPO_DISPLAY)) {
    const repoIssues = recentData[repoKey] || [];
    if (!repoIssues.length) continue;

    // 마일스톤별 그룹핑 (없는 것은 'No Milestone')
    const byMilestone = {};
    for (const issue of repoIssues) {
      const ms = issue.milestone || 'No Milestone';
      if (!byMilestone[ms]) byMilestone[ms] = [];
      byMilestone[ms].push(issue);
    }

    issueSection += `\n**${displayName}**\n`;
    for (const [ms, issues] of Object.entries(byMilestone)) {
      issueSection += `\n  *${ms}*\n`;
      for (const issue of issues) {
        const stateTag = issue.state === 'closed' ? ' *(closed)*' : '';
        issueSection += `  - ${issue.url} — ${issue.title}${stateTag}\n`;
      }
    }
  }
  if (!issueSection) issueSection = '\n  이번 주 업데이트된 이슈가 없습니다.\n';

  // ── 담당자 현황 ──
  const memberSection = UX_MEMBERS.map(l => memberLine(allMsIssues, l)).join('\n');

  // ── 리스크 ──
  let risks = '';
  for (const login of UX_MEMBERS) {
    const mine = allMsIssues.filter(i => (i.assignees||[]).some(a => a.login === login));
    const notSpecFixed = mine.filter(i => ['todo','in-progress'].includes(i.status)).length;
    const inSpecFix    = mine.filter(i => i.status === 'spec-fix').length;
    if (pastMdFix && (notSpecFixed+inSpecFix) > 0)
      risks += `  ⛔ @${login} MD Fix 미완 ${notSpecFixed+inSpecFix}개\n`;
    else if (pastSpecFix && notSpecFixed > 0)
      risks += `  ⚠ @${login} Spec Fix 미완 ${notSpecFixed}개\n`;
    else if (pastSpecFix && inSpecFix > 0)
      risks += `  → @${login} MD Fix 전환 필요 ${inSpecFix}개\n`;
  }
  if (!risks) risks = '  특이사항 없음\n';

  return `## 서비스 UX

### 주요 업무
${keyWork}
### 1. 이번 주 업무 현황 (${currentMilestone})
${issueSection}
### 2. 리스크 / 특이사항
${risks}
### 3. 결정 필요 사항
  (직접 추가)`;
}

// 🔧 플랫폼 UX sync — 서버 스펙 / 관제툴 중심
function genPlatformSync(today, cfg, msKey) {
  const targetRepos = ['shucle-product', 'shucle-registry', 'shucle-ux'];
  const allRepos = { ...issuesData.milestone_products, ...issuesData.always_on_products };

  let repoLines = '';
  const allIssues = [];
  for (const key of targetRepos) {
    const repo = allRepos[key];
    if (!repo) continue;
    // 상시 확인 레포는 msKey 필터 없이 전체
    const issues = repo.issues;
    allIssues.push(...issues);
    const c = countStatuses(issues);
    const pct = issues.length ? Math.round((c.done||0)/issues.length*100) : 0;
    repoLines += `  • ${pad(repo.display_name,12)} 전체 ${issues.length}개  완료 ${c.done||0}개`;
    if (c['in-progress']) repoLines += `  | In Progress ${c['in-progress']}`;
    if (c['todo'])        repoLines += `  | Todo ${c['todo']}`;
    repoLines += '\n';
  }

  const inProgress = allIssues.filter(i => i.status === 'in-progress').slice(0,7)
    .map(i => `    - [#${i.number}] ${i.title}`).join('\n') || '    없음';
  const todo = allIssues.filter(i => i.status === 'todo').slice(0,5)
    .map(i => `    - [#${i.number}] ${i.title}`).join('\n') || '    없음';

  const memberSection = UX_MEMBERS.map(l => memberLine(allIssues, l)).join('\n');

  return `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔧 플랫폼 UX sync  ${today}
서버 스펙 / 관제툴 중심  (bi-weekly)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

【 플랫폼 레포 현황 】
${repoLines}
【 진행 중 이슈 (서버 스펙 / 관제툴) 】
${inProgress}

【 시작 예정 (Todo) 】
${todo}

【 담당자별 현황 】
${memberSection}

【 서버 스펙 논의 사항 】
  (직접 추가)

【 관제툴 관련 이슈 】
  (직접 추가)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;}

// 기존 openMeeting alias 유지 (Today's Focus에서 호출)
function openMeeting(cfg, msKey) { openMeetingModal(cfg, msKey); }

// ── 마지막 갱신 ───────────────────────────────────────────
function renderLastUpdated() {
  const el = document.getElementById('lastUpdated');
  if (!issuesData.generated_at) { el.textContent = ''; return; }
  const d = new Date(issuesData.generated_at);
  el.textContent = `최신: ${d.toLocaleString('ko-KR')}`;
}

// ── 날짜 설정: localStorage override ─────────────────────
const DATE_STORAGE_KEY = 'ux-dashboard-dates';

function loadSavedDates() {
  try { return JSON.parse(localStorage.getItem(DATE_STORAGE_KEY) || '{}'); }
  catch { return {}; }
}

function saveDates(data) {
  localStorage.setItem(DATE_STORAGE_KEY, JSON.stringify(data));
}

// 마일스톤 날짜 조회 — localStorage 우선, config fallback
function getMilestoneDates(msName) {
  const saved  = loadSavedDates()[msName] || {};
  const config = milestonesConfig.milestones[msName]?.dates || {};
  return { ...config, ...saved };  // saved가 config를 override
}

// ── 설정 모달 ─────────────────────────────────────────────
function openDateSettings() {
  const saved = loadSavedDates();
  const milestones = Object.keys(milestonesConfig.milestones);

  // 탭 생성
  const tabsHtml = milestones.map((ms, i) =>
    `<button class="meeting-tab ${i===0?'active':''}" data-ms="${ms}"
      onclick="switchSettingsTab('${ms}')">${ms}</button>`
  ).join('');

  // 각 마일스톤 폼 생성
  const formsHtml = milestones.map((ms, i) => {
    const dates = getMilestoneDates(ms);
    const fields = Object.entries(TIMELINE_LABELS).map(([key, label]) => `
      <div class="settings-field">
        <label class="settings-label">${label}</label>
        <input type="date" class="settings-input" data-ms="${ms}" data-key="${key}"
          value="${dates[key] || ''}"
          onchange="onDateChange('${ms}','${key}',this.value)">
      </div>`).join('');

    return `<div class="settings-form" data-ms="${ms}" style="display:${i===0?'block':'none'}">${fields}</div>`;
  }).join('');

  document.getElementById('settingsBody').innerHTML = `
    <div class="meeting-tabs">${tabsHtml}</div>
    <div class="settings-forms">${formsHtml}</div>`;

  document.getElementById('settingsModal').style.display = 'flex';
}

function switchSettingsTab(ms) {
  document.querySelectorAll('#settingsBody .meeting-tab').forEach(b =>
    b.classList.toggle('active', b.dataset.ms === ms));
  document.querySelectorAll('#settingsBody .settings-form').forEach(f =>
    f.style.display = f.dataset.ms === ms ? 'block' : 'none');
}

function onDateChange(ms, key, value) {
  const saved = loadSavedDates();
  if (!saved[ms]) saved[ms] = {};
  if (value) saved[ms][key] = value;
  else delete saved[ms][key];
  saveDates(saved);
  // 실시간 반영
  renderWeekStrip();
  renderAlertsPanel();
}

function closeSettings() {
  document.getElementById('settingsModal').style.display = 'none';
}

// ── 전체 마일스톤 날짜 수집 ───────────────────────────────
// returns: [{ ms, key, label, date, diff }, ...]  sorted by date
function getAllMilestoneDates() {
  const entries = [];
  for (const msName of Object.keys(milestonesConfig.milestones)) {
    const dates = getMilestoneDates(msName);  // localStorage override 적용
    for (const [key, dateStr] of Object.entries(dates)) {
      if (!dateStr) continue;
      const label = TIMELINE_LABELS[key];
      if (!label) continue;
      entries.push({ ms: msName, key, label, date: dateStr, diff: dayDiff(dateStr) });
    }
  }
  return entries.sort((a, b) => a.diff - b.diff);
}

// ── 타임라인 ──────────────────────────────────────────────
const TIMELINE_LABELS = {
  scope_share:        '1차 Scope 공유',
  upper_plan_share:   '상위기획 공유',
  service_plan_share: '서비스/운영기획 공유',
  detail_review:      '상세 기획 리뷰',
  issue_done:         '이슈 검토 완료',
  spec_fix:           'Spec Fix',
  md_fix:             'MD Fix',
  mock_review:        '모사실 리뷰',
  dev_sanity:         'Dev Sanity',
};

function dayDiff(dateStr) {
  const today = new Date(); today.setHours(0,0,0,0);
  const target = new Date(dateStr); target.setHours(0,0,0,0);
  return Math.round((target - today) / 86400000);
}

function renderTimeline(cfg) {
  const el = document.getElementById('timeline');
  if (!cfg) { el.innerHTML = ''; return; }

  const entries = Object.entries(TIMELINE_LABELS);
  el.innerHTML = entries.map(([key, label], i) => {
    const dateStr = cfg.dates[key];
    if (!dateStr || dateStr.trim() === '') return '';
    const diff   = dayDiff(dateStr);
    let badgeClass, badgeText;
    if (diff < 0)        { badgeClass = 'badge-overdue'; badgeText = `D+${-diff} 지연`; }
    else if (diff === 0) { badgeClass = 'badge-today';   badgeText = 'D-Day'; }
    else if (diff <= 3)  { badgeClass = 'badge-danger';  badgeText = `D-${diff}`; }
    else if (diff <= 7)  { badgeClass = 'badge-soon';    badgeText = `D-${diff}`; }
    else                 { badgeClass = 'badge-future';   badgeText = `D-${diff}`; }

    const sep = i < entries.length - 1 ? '<div class="timeline-sep"></div>' : '';
    return `
      <div class="timeline-item">
        <div class="timeline-label">${label}</div>
        <div class="timeline-date">${dateStr}</div>
        <div class="timeline-badge ${badgeClass}">${badgeText}</div>
      </div>
      ${sep}`;
  }).join('');
}

// ── 일정 알림 탭 전환 ─────────────────────────────────────
function switchWeekTab(tab) {
  const isWeek = tab === 'week';
  document.getElementById('tabWeek').classList.toggle('active', isWeek);
  document.getElementById('tabAlerts').classList.toggle('active', !isWeek);
  document.getElementById('weekStrip').style.display   = isWeek ? '' : 'none';
  document.getElementById('dayDetail').style.display   = isWeek ? '' : 'none';
  document.getElementById('alertsPanel').style.display = isWeek ? 'none' : '';
}

// ── 일정 알림 패널 ────────────────────────────────────────
function renderAlertsPanel() {
  const items = [];
  const today = new Date(); today.setHours(0,0,0,0);

  // 전체 마일스톤 날짜 — 가까운 순으로 정렬해서 표시
  const allDates = getAllMilestoneDates();
  for (const { ms, label, date, diff } of allDates) {
    const tag = `<strong>[${ms}] ${label}</strong>`;
    if (diff < 0)        items.push({ type:'danger',  html:`⛔ ${tag} 마감 D+${-diff} 지연 (${date})` });
    else if (diff === 0) items.push({ type:'danger',  html:`🔴 ${tag} 오늘 마감 (${date})` });
    else if (diff <= 3)  items.push({ type:'warning', html:`🟡 ${tag} D-${diff} — ${date}까지` });
    else if (diff <= 7)  items.push({ type:'info',    html:`🔵 ${tag} 이번 주 마감 D-${diff} (${date})` });
    else                 items.push({ type:'ok',      html:`🟢 ${tag} D-${diff} (${date})` });
  }

  // 멤버 리스크 — 현재 선택 마일스톤 기준
  const cfg   = milestonesConfig.milestones[currentMilestone];
  const msKey = cfg ? cfg.github_milestone : currentMilestone;
  const specFixDeadline = cfg?.dates?.spec_fix ? new Date(cfg.dates.spec_fix) : null;
  const mdFixDeadline   = cfg?.dates?.md_fix   ? new Date(cfg.dates.md_fix)   : null;
  const pastSpecFix = specFixDeadline && today > specFixDeadline;
  const pastMdFix   = mdFixDeadline   && today > mdFixDeadline;

  const allIssues = [];
  for (const repo of Object.values(issuesData.milestone_products)) {
    const filtered = msKey ? repo.issues.filter(i => i.milestone === msKey) : repo.issues;
    allIssues.push(...filtered);
  }

  const memberItems = [];
  for (const login of UX_MEMBERS) {
    const mine = allIssues.filter(i => (i.assignees||[]).some(a => a.login === login));
    const notSpecFixed = mine.filter(i => ['todo','in-progress'].includes(i.status)).length;
    const inSpecFix    = mine.filter(i => i.status === 'spec-fix').length;
    if (pastMdFix && (notSpecFixed+inSpecFix) > 0)
      memberItems.push({ type:'danger',  html:`⛔ <strong>@${login}</strong> MD Fix 미완 ${notSpecFixed+inSpecFix}개` });
    else if (pastSpecFix && notSpecFixed > 0)
      memberItems.push({ type:'danger',  html:`⚠ <strong>@${login}</strong> Spec Fix 미완 ${notSpecFixed}개` });
    else if (pastSpecFix && inSpecFix > 0)
      memberItems.push({ type:'warning', html:`→ <strong>@${login}</strong> MD Fix 전환 필요 ${inSpecFix}개` });
  }
  if (memberItems.length) {
    items.push({ type:'', html:'<strong style="font-size:11px;color:var(--text-dim);text-transform:uppercase;letter-spacing:.5px">담당자 리스크</strong>' });
    items.push(...memberItems);
  }

  if (!items.length) {
    document.getElementById('alertsPanel').innerHTML = `<div class="day-detail-empty">🟢 현재 일정 알림이 없습니다.</div>`;
    return;
  }

  document.getElementById('alertsPanel').innerHTML = `<div class="focus-items">${
    items.map(({ type, html }) => `<div class="focus-item ${type}" style="${!type?'padding:8px 0 2px;background:none;border:none':''}">${html}</div>`).join('')
  }</div>`;
}

// ── 담당자별 업무 현황 ────────────────────────────────────
function renderMemberOverview(msKey) {
  const el = document.getElementById('memberOverview');
  const cfg = milestonesConfig.milestones[currentMilestone];

  // 전체 마일스톤 제품 이슈 집계
  const allIssues = [];
  for (const repo of Object.values(issuesData.milestone_products)) {
    const issues = msKey ? repo.issues.filter(i => i.milestone === msKey) : repo.issues;
    allIssues.push(...issues);
  }

  // 멤버별 집계
  const memberData = {};
  for (const login of UX_MEMBERS) {
    memberData[login] = { counts: {}, total: 0 };
  }
  for (const issue of allIssues) {
    for (const a of (issue.assignees || [])) {
      if (!UX_MEMBERS.includes(a.login)) continue;
      memberData[a.login].counts[issue.status] = (memberData[a.login].counts[issue.status] || 0) + 1;
      memberData[a.login].total++;
    }
  }

  const maxTotal = Math.max(...Object.values(memberData).map(d => d.total), 1);

  el.innerHTML = UX_MEMBERS.map(login => {
    const d = memberData[login];
    const done       = d.counts['done'] || 0;
    const specFix    = d.counts['spec-fix'] || 0;
    const mdFix      = d.counts['md-fix'] || 0;
    const inProgress = d.counts['in-progress'] || 0;
    const todo       = d.counts['todo'] || 0;
    const notDone    = d.total - done;
    const pct        = d.total ? Math.round(done / d.total * 100) : 0;

    const today = new Date(); today.setHours(0,0,0,0);
    const specFixDeadline = cfg?.dates?.spec_fix ? new Date(cfg.dates.spec_fix) : null;
    const mdFixDeadline   = cfg?.dates?.md_fix   ? new Date(cfg.dates.md_fix)   : null;
    const pastSpecFix = specFixDeadline && today > specFixDeadline;
    const pastMdFix   = mdFixDeadline   && today > mdFixDeadline;

    // spec fix가 안 된 이슈 = todo + in-progress
    const notSpecFixed = (d.counts['todo'] || 0) + (d.counts['in-progress'] || 0);

    let riskClass = '', riskLabel = '', riskLabelClass = '';
    if (pastMdFix && (notSpecFixed + specFix) > 0) {
      // MD Fix 마감 지났는데 spec-fix 이하 상태가 남음
      riskClass = 'risk-danger';
      riskLabel = `🔴 MD Fix 미완 ${notSpecFixed + specFix}개`;
      riskLabelClass = 'risk-label-danger';
    } else if (pastSpecFix && notSpecFixed > 0) {
      // Spec Fix 마감 지났는데 아직 spec-fix 안 된 이슈 있음
      riskClass = 'risk-danger';
      riskLabel = `🔴 Spec Fix 미완 ${notSpecFixed}개`;
      riskLabelClass = 'risk-label-danger';
    } else if (pastSpecFix && specFix > 0) {
      // Spec Fix 마감 지났고, spec-fix 상태 (MD Fix로 넘어가야 함)
      riskClass = 'risk-warning';
      riskLabel = `🟡 MD Fix 전환 필요 ${specFix}개`;
      riskLabelClass = 'risk-label-warning';
    } else if (notSpecFixed > 0 && !pastSpecFix) {
      // 마감 전, 진행 중 이슈 있음 — 정상
      riskLabel = '🟢 정상'; riskLabelClass = 'risk-label-safe';
    } else {
      riskLabel = '🟢 정상'; riskLabelClass = 'risk-label-safe';
    }

    const barSegs = STATUS_ORDER.map(s => {
      const n = d.counts[s] || 0;
      if (!n) return '';
      const w = (n / maxTotal * 100).toFixed(1);
      return `<div class="progress-seg ${STATUS_COLORS[s]}" style="width:${w}%" title="${STATUS_LABELS[s]}: ${n}"></div>`;
    }).join('');

    const stats = [
      { label: 'Done',     val: done,       color: 'var(--status-done)' },
      { label: 'MD Fix',   val: mdFix,      color: 'var(--status-yel)' },
      { label: 'Spec Fix', val: specFix,    color: 'var(--status-org)' },
      { label: 'In Prog',  val: inProgress, color: 'var(--status-blue)' },
      { label: 'Todo',     val: todo,       color: 'var(--status-gray)' },
    ].filter(s => s.val > 0).map(s => `
      <div class="member-stat">
        <div class="count-dot" style="background:${s.color}"></div>
        ${s.label} <strong>${s.val}</strong>
      </div>`).join('');

    return `
      <div class="member-card ${riskClass}">
        <div class="member-card-header">
          <div class="member-info">
            <img class="member-avatar" src="https://github.com/${login}.png?size=64" alt="${login}">
            <div>
              <div class="member-name">${login}</div>
              <div class="member-total">${notDone} / ${d.total}개 진행 중 (${pct}% 완료)</div>
            </div>
          </div>
          <span class="member-risk ${riskLabelClass}">${riskLabel}</span>
        </div>
        <div class="member-bar-wrap">${barSegs}</div>
        <div class="member-stats">${stats || '<span style="color:var(--text-dim);font-size:12px;">배정 없음</span>'}</div>
      </div>`;
  }).join('');
}

// ── 제품 섹션 렌더 ────────────────────────────────────────
function renderProducts(containerId, products, msKey) {
  const el = document.getElementById(containerId);
  if (!products || !Object.keys(products).length) {
    el.innerHTML = '<div class="loading">데이터 없음</div>';
    return;
  }

  el.innerHTML = Object.entries(products).map(([repoKey, repo]) => {
    const issues = msKey
      ? repo.issues.filter(i => i.milestone === msKey)
      : repo.issues;

    const counts  = countStatuses(issues);
    const total   = issues.length;
    const done    = counts.done || 0;
    const pct     = total ? Math.round(done / total * 100) : 0;

    return `
      <div class="product-card">
        <div class="product-card-header">
          <span class="product-name">${repo.display_name}</span>
          <span class="product-pct">${pct}%</span>
        </div>
        <div class="progress-wrap">
          ${buildProgressBar(counts, total)}
        </div>
        <div class="progress-counts">
          ${buildCountBadges(counts)}
        </div>
        <div class="assignee-section">
          <h4>담당자별 현황</h4>
          <div class="assignee-rows">
            ${buildAssigneeRows(issues, total)}
          </div>
        </div>
        ${buildMemoHtml(repoKey)}
      </div>`;
  }).join('');
}

// ── 헬퍼: status 집계 (type=task 제외) ───────────────────
function countStatuses(issues) {
  const counts = {};
  for (const issue of issues) {
    if (issue.status === null) continue; // task 타입 제외
    counts[issue.status] = (counts[issue.status] || 0) + 1;
  }
  return counts;
}

// ── 헬퍼: progress bar ───────────────────────────────────
function buildProgressBar(counts, total) {
  if (!total) return '<div class="progress-bar"></div>';
  const segs = STATUS_ORDER.map(s => {
    const n = counts[s] || 0;
    if (!n) return '';
    const pct = (n / total * 100).toFixed(1);
    return `<div class="progress-seg ${STATUS_COLORS[s]}" style="width:${pct}%" title="${STATUS_LABELS[s] || s}: ${n}"></div>`;
  }).join('');
  return `<div class="progress-bar">${segs}</div>`;
}

// ── 헬퍼: count badges ───────────────────────────────────
function buildCountBadges(counts) {
  return STATUS_ORDER.filter(s => counts[s]).map(s => `
    <div class="count-item">
      <div class="count-dot" style="background:${dotColor(s)}"></div>
      <span>${STATUS_LABELS[s] || s}</span>
      <strong>${counts[s]}</strong>
    </div>`).join('');
}

function dotColor(s) {
  const map = {
    done: 'var(--status-done)', 'md-fix': 'var(--status-yel)',
    'spec-fix': 'var(--status-org)', 'in-progress': 'var(--status-blue)',
    todo: 'var(--status-gray)', icebox: 'var(--status-purp)', other: 'var(--status-gray)'
  };
  return map[s] || 'var(--status-gray)';
}

// ── 헬퍼: assignee rows ──────────────────────────────────
function buildAssigneeRows(issues, productTotal) {
  if (!issues.length) return '<div style="color:var(--text-dim);font-size:12px;">이슈 없음</div>';

  // UX 멤버만 집계
  const assigneeMap = {};
  for (const login of UX_MEMBERS) {
    assigneeMap[login] = { avatar: `https://github.com/${login}.png?size=40`, counts: {}, total: 0 };
  }

  for (const issue of issues) {
    const assignees = issue.assignees && issue.assignees.length ? issue.assignees : [];
    for (const a of assignees) {
      if (!UX_MEMBERS.includes(a.login)) continue;
      assigneeMap[a.login].counts[issue.status] = (assigneeMap[a.login].counts[issue.status] || 0) + 1;
      assigneeMap[a.login].total++;
    }
  }

  // 업무량 기준 정렬 (많은 순)
  const sorted = Object.entries(assigneeMap).sort((a, b) => b[1].total - a[1].total);
  const maxTotal = sorted[0]?.[1].total || 1;

  return sorted.map(([login, data]) => {
    const inFlight = (data.counts['in-progress'] || 0) + (data.counts['spec-fix'] || 0) + (data.counts['md-fix'] || 0);
    const notDone  = data.total - (data.counts['done'] || 0);

    // 리스크 판단: 진행 중인데 spec-fix/md-fix가 많으면 위험
    let rowClass = '';
    if (data.counts['spec-fix'] >= 3 || data.counts['md-fix'] >= 3) rowClass = 'danger';
    else if (inFlight >= 5) rowClass = 'warning';

    const warningIcon = rowClass === 'danger'  ? ' <span class="warning-icon">🔴</span>' :
                        rowClass === 'warning' ? ' <span class="warning-icon">🟡</span>' : '';

    const avatarHtml = data.avatar
      ? `<img class="assignee-avatar" src="${data.avatar}" alt="${login}">`
      : `<div class="assignee-avatar"></div>`;

    const barSegs = STATUS_ORDER.map(s => {
      const n = data.counts[s] || 0;
      if (!n) return '';
      const pct = (n / maxTotal * 100).toFixed(1);
      return `<div class="progress-seg ${STATUS_COLORS[s]}" style="width:${pct}%" title="${STATUS_LABELS[s]}: ${n}"></div>`;
    }).join('');

    return `
      <div class="assignee-row ${rowClass}">
        <div class="assignee-name">
          ${avatarHtml}
          ${login}${warningIcon}
        </div>
        <div class="assignee-bar-wrap">${barSegs}</div>
        <div class="assignee-total">${notDone} / ${data.total}</div>
      </div>`;
  }).join('');
}

// ── 메모 ─────────────────────────────────────────────────
function memoKey(repo) {
  return `ux-dash-memo::${repo}::${currentMilestone}`;
}

function buildMemoHtml(repo) {
  const saved = localStorage.getItem(memoKey(repo)) || '';
  return `
    <div class="product-memo" data-repo="${repo}">
      <div class="memo-header">
        <span>📝 메모</span>
        <div class="memo-actions">
          <button class="memo-btn edit-btn" onclick="toggleMemoEdit('${repo}')">편집</button>
          <button class="memo-btn save save-btn" style="display:none" onclick="saveMemo('${repo}')">저장</button>
          <button class="memo-btn del-btn" style="display:none" onclick="deleteMemo('${repo}')">삭제</button>
        </div>
      </div>
      <div class="memo-display ${saved ? '' : 'empty'}">${saved || ''}</div>
      <textarea class="memo-textarea" placeholder="이 제품에 대한 메모를 입력하세요...">${saved}</textarea>
    </div>`;
}

function toggleMemoEdit(repo) {
  const wrap = document.querySelector(`.product-memo[data-repo="${repo}"]`);
  const display  = wrap.querySelector('.memo-display');
  const textarea = wrap.querySelector('.memo-textarea');
  const editBtn  = wrap.querySelector('.edit-btn');
  const saveBtn  = wrap.querySelector('.save-btn');
  const delBtn   = wrap.querySelector('.del-btn');
  const isEditing = textarea.style.display === 'block';

  if (isEditing) {
    textarea.style.display = 'none';
    display.style.display  = '';
    editBtn.style.display  = '';
    saveBtn.style.display  = 'none';
    delBtn.style.display   = 'none';
  } else {
    textarea.style.display = 'block';
    display.style.display  = 'none';
    editBtn.style.display  = 'none';
    saveBtn.style.display  = '';
    delBtn.style.display   = localStorage.getItem(memoKey(repo)) ? '' : 'none';
    textarea.focus();
  }
}

function saveMemo(repo) {
  const wrap = document.querySelector(`.product-memo[data-repo="${repo}"]`);
  const textarea = wrap.querySelector('.memo-textarea');
  const display  = wrap.querySelector('.memo-display');
  const val = textarea.value.trim();

  if (val) {
    localStorage.setItem(memoKey(repo), val);
    display.textContent = val;
    display.classList.remove('empty');
  } else {
    localStorage.removeItem(memoKey(repo));
    display.textContent = '';
    display.classList.add('empty');
  }
  toggleMemoEdit(repo);
}

function deleteMemo(repo) {
  localStorage.removeItem(memoKey(repo));
  const wrap = document.querySelector(`.product-memo[data-repo="${repo}"]`);
  wrap.querySelector('.memo-display').textContent = '';
  wrap.querySelector('.memo-display').classList.add('empty');
  wrap.querySelector('.memo-textarea').value = '';
  toggleMemoEdit(repo);
}

// ── 시작 ─────────────────────────────────────────────────
loadAll();
