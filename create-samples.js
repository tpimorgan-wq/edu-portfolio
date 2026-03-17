// create-samples.js
// Usage: node create-samples.js
// Requires: FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, FIREBASE_ADMIN_PRIVATE_KEY in .env.local

const admin = require('firebase-admin')
const { readFileSync } = require('fs')
const { resolve } = require('path')

// ── Load .env.local ─────────────────────────────────────────
const envPath = resolve(__dirname, '.env.local')
const envContent = readFileSync(envPath, 'utf-8')
const env = {}
for (const line of envContent.split('\n')) {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith('#')) continue
  const idx = trimmed.indexOf('=')
  if (idx === -1) continue
  const key = trimmed.slice(0, idx).trim()
  let val = trimmed.slice(idx + 1).trim()
  // strip surrounding quotes
  if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
    val = val.slice(1, -1)
  }
  env[key] = val
}

// ── Firebase Admin init ─────────────────────────────────────
const privateKey = (env.FIREBASE_ADMIN_PRIVATE_KEY || '').replace(/\\n/g, '\n')
admin.initializeApp({
  credential: admin.credential.cert({
    projectId: env.FIREBASE_ADMIN_PROJECT_ID,
    clientEmail: env.FIREBASE_ADMIN_CLIENT_EMAIL,
    privateKey,
  }),
})
const db = admin.firestore()

// ── Constants ───────────────────────────────────────────────
const CONSULTANT_1 = 'rMfW9Y2Gg4R88K8nHKHvolQuL4U2' // 최지용
const CONSULTANT_2 = '4P4cUEY5edhwTmV23GfFgYLcDct2' // 베에리
const ADMIN_ID = 'RQvAEAxn4tSMd4Vmq2qO1BV02Sx2'
const NOW = new Date().toISOString()

function date(d) { return d } // pass-through for clarity
function ts(d) { return new Date(d).toISOString() }

// ── Student definitions ─────────────────────────────────────
const students = [
  // ── 탑보딩스쿨 준비 (4명) ──
  {
    student: {
      name: '김준혁',
      birth_date: '2011-05-12',
      nationality: '한국',
      school: '대원외국어고등학교',
      grade: 'G8(Y9)',
      target_countries: ['미국'],
      target_majors: ['수학', 'STEM'],
      main_consultant_id: CONSULTANT_1,
      consultant_ids: [CONSULTANT_1, CONSULTANT_2],
      parent_id: null,
      user_id: null,
      notes: '탑보딩 Exeter/Andover 목표. 수학올림피아드 강점.',
      status: 'active',
    },
    exams: [
      { exam_type: 'SSAT', exam_date: '2025-11-15', score: '2280', subscores: { Math: '790', Verbal: '750', Reading: '740' }, notes: 'First attempt' },
      { exam_type: 'TOEFL', exam_date: '2025-10-20', score: '108', subscores: { Reading: '28', Listening: '27', Speaking: '25', Writing: '28' }, notes: null },
    ],
    gpa: [
      { semester: '1', year: 2025, gpa: 3.92, scale: 4.0, school: '대원외국어고등학교', notes: null },
      { semester: '2', year: 2025, gpa: 3.95, scale: 4.0, school: '대원외국어고등학교', notes: null },
    ],
    ec: [
      { activity_name: '전국수학올림피아드(KMO)', category: '학술/리서치', position: '금상 수상자', organization: '대한수학회', start_date: '2024-03-01', end_date: null, hours_per_week: 10, description: 'KMO 본선 진출 및 금상 수상. AMC 10/12 동시 준비 중.', achievements: 'KMO 금상, AMC 10 상위 5%' },
      { activity_name: '모의유엔(IMUN)', category: '리더십', position: 'Delegate', organization: 'International Model United Nations', start_date: '2024-09-01', end_date: '2025-06-30', hours_per_week: 4, description: '국제 이슈에 대한 토론 및 결의안 작성. 영어 의사소통 능력 강화.', achievements: 'IMUN 최우수상 (Outstanding Delegate)' },
      { activity_name: '첼로 연주', category: '예술/음악', position: '수석 첼리스트', organization: '서울시청소년오케스트라', start_date: '2020-03-01', end_date: null, hours_per_week: 6, description: '오케스트라 정기 공연 참여. 수석 첼리스트로 독주 파트 담당. 독주회 2회 개최.', achievements: '전국 학생 음악 콩쿠르 금상, 서울시청소년오케스트라 수석' },
      { activity_name: '다문화가정 영어 튜터링', category: '봉사활동', position: '튜터', organization: '대원외고 다문화봉사단', start_date: '2024-05-01', end_date: null, hours_per_week: 3, description: '다문화가정 초등학생 대상 영어 1:1 튜터링. 주 2회 방문 교육.', achievements: '누적 봉사시간 120시간, 학생 영어 성적 평균 2등급 향상' },
      { activity_name: '과학영재교육원 수료', category: '학술/리서치', position: '수료생', organization: '서울대학교 과학영재교육원', start_date: '2024-03-01', end_date: '2025-02-28', hours_per_week: 4, description: '서울대 과학영재교육원 수학/과학 심화과정 1년 수료.', achievements: '수료 인증서, 우수 연구 프로젝트 발표상' },
      { activity_name: '학생회 부회장', category: '리더십', position: '부회장', organization: '대원외국어고등학교 학생회', start_date: '2025-03-01', end_date: null, hours_per_week: 5, description: '학생회 부회장으로서 교내 행사 기획 및 학생 의견 대표. 학교 축제 총괄 기획.', achievements: '교내 축제 역대 최대 규모 개최, 학생 만족도 조사 1위' },
    ],
    assignments: [
      { title: 'Exeter 지원 에세이 초안', category: '에세이', status: 'in_progress', description: 'Exeter 공통 에세이 "What excites your mind?" 초안 작성', assigned_date: '2026-03-10', due_date: '2026-03-25' },
      { title: 'SSAT 2차 시험 준비', category: '공인시험', status: 'todo', description: '2차 SSAT 목표 점수 2350+. Math section 집중 보완.', assigned_date: '2026-03-15', due_date: '2026-04-10' },
      { title: '추천서 요청서 작성', category: '필수서류', status: 'todo', description: '수학 선생님, 영어 선생님 추천서 요청 양식 작성', assigned_date: '2026-03-16', due_date: '2026-03-30' },
    ],
    schedules: [
      { title: 'Exeter 입학 설명회 참석', description: '온라인 Exeter 입학 설명회. 질문 준비 필요.', event_date: '2026-04-05', event_time: '10:00', type: '행사', zoom_link: null, status: 'upcoming' },
      { title: '에세이 컨설팅 (최지용)', description: 'Exeter 에세이 1차 초안 리뷰', event_date: '2026-03-28', event_time: '16:00', type: '상담', zoom_link: null, status: 'upcoming' },
    ],
    notes: [
      { author_id: CONSULTANT_1, author_name: '최지용', note_date: '2026-03-10', content: '김준혁 학생 첫 상담. Exeter/Andover 동시 지원 전략 논의. 수학올림피아드 실적이 강점이나 에세이에서 인문학적 깊이도 보여줄 필요. 첼로 활동을 개인적 성장 스토리와 연결하는 방향으로 에세이 구상. SSAT Verbal 섹션 보강 필요.' },
    ],
  },
  {
    student: {
      name: '이서연',
      birth_date: '2010-08-23',
      nationality: '한국',
      school: '청심국제중학교',
      grade: 'G9(Y10)',
      target_countries: ['미국'],
      target_majors: ['영문학', '인문학'],
      main_consultant_id: CONSULTANT_2,
      consultant_ids: [CONSULTANT_2, CONSULTANT_1],
      parent_id: null,
      user_id: null,
      notes: '탑보딩 Choate/Hotchkiss 목표. 글쓰기 역량 우수.',
      status: 'active',
    },
    exams: [
      { exam_type: 'SSAT', exam_date: '2025-12-01', score: '2310', subscores: { Math: '760', Verbal: '780', Reading: '770' }, notes: '99th percentile' },
      { exam_type: 'TOEFL', exam_date: '2025-11-10', score: '114', subscores: { Reading: '30', Listening: '28', Speaking: '27', Writing: '29' }, notes: null },
    ],
    gpa: [
      { semester: '1', year: 2025, gpa: 3.97, scale: 4.0, school: '청심국제중학교', notes: '영어/국어 과목 최상위' },
      { semester: '2', year: 2025, gpa: 3.95, scale: 4.0, school: '청심국제중학교', notes: null },
    ],
    ec: [
      { activity_name: '한국청소년문학상 수상', category: '학술/리서치', position: '최우수상 수상자', organization: '한국문인협회', start_date: '2024-03-01', end_date: null, hours_per_week: 5, description: '단편소설 및 시 창작. 전국 청소년 문학 공모전 참가.', achievements: '한국청소년문학상 최우수상, 교내 문예지 창간' },
      { activity_name: '영자신문 The Herald 편집장', category: '리더십', position: 'Editor-in-Chief', organization: 'The Cheongshim Herald', start_date: '2024-09-01', end_date: null, hours_per_week: 5, description: '영어 신문 기사 작성, 편집, 발행 총괄. 인터뷰 기획 및 기자 교육 담당.', achievements: '한국영자신문협회 우수 기사상, 발행 부수 2배 확대' },
      { activity_name: '피아노 (한예종 영재과정)', category: '예술/음악', position: '영재과정 수강생', organization: '한국예술종합학교 영재교육원', start_date: '2016-01-01', end_date: null, hours_per_week: 6, description: '한예종 음악영재교육원 피아노 과정 수료. 쇼팽/리스트 레퍼토리 전문.', achievements: '한국 피아노학회 콩쿠르 2위, 한예종 영재과정 수료' },
      { activity_name: '환경클럽 회장 (제로웨이스트 캠페인)', category: '리더십', position: '회장', organization: '청심국제중 Green Earth Club', start_date: '2024-09-01', end_date: null, hours_per_week: 3, description: '교내 제로웨이스트 캠페인 기획 및 실행. 일회용품 사용 절감 프로젝트 운영.', achievements: '교내 일회용품 사용 40% 절감, 제주도 환경 다큐멘터리 제작' },
      { activity_name: 'TEDx Youth 발표자', category: '리더십', position: 'Speaker', organization: 'TEDxYouth@Cheongshim', start_date: '2025-05-01', end_date: '2025-05-15', hours_per_week: 10, description: '"Stories That Change the World" 주제로 TEDx 발표. 문학이 사회 변화에 미치는 영향에 대해 강연.', achievements: 'TEDx 공식 영상 조회수 5,000회 돌파' },
      { activity_name: '모의유엔 사무총장', category: '리더십', position: 'Secretary-General', organization: 'CISMUN (Cheongshim International School MUN)', start_date: '2025-03-01', end_date: null, hours_per_week: 4, description: '교내 MUN 대회 창설 및 사무총장 역할. 6개국 학교 참가 유치.', achievements: 'CISMUN 창설, 참가자 200명 규모 대회 성공 개최' },
    ],
    assignments: [
      { title: 'Choate 지원 에세이 브레인스토밍', category: '에세이', status: 'in_progress', description: '자기소개 에세이 주제 3개 후보 선정 및 아웃라인 작성', assigned_date: '2026-03-08', due_date: '2026-03-22' },
      { title: '활동 목록 정리', category: '기타', status: 'done', description: '전체 EC 활동 목록 영문 정리 및 시간 기록 확인', assigned_date: '2026-03-01', due_date: '2026-03-15' },
    ],
    schedules: [
      { title: 'Choate 캠퍼스 투어', description: '미국 방문 시 Choate 캠퍼스 투어 예약', event_date: '2026-04-15', event_time: '09:00', type: '학교 방문', zoom_link: null, status: 'upcoming' },
    ],
    notes: [
      { author_id: CONSULTANT_2, author_name: '베에리', note_date: '2026-03-08', content: '이서연 학생 상담. 글쓰기 실력이 또래 대비 매우 우수. 소설 창작 활동을 에세이에서 강하게 어필할 것. Choate의 문학 프로그램과 연결짓는 전략. Hotchkiss는 피아노 특기로 차별화. 인터뷰 준비도 병행 시작할 것.' },
    ],
  },
  {
    student: {
      name: '박민준',
      birth_date: '2011-02-17',
      nationality: '한국',
      school: '노스런던컬리지에잇스쿨 제주(NLCS Jeju)',
      grade: 'G8(Y9)',
      target_countries: ['미국'],
      target_majors: ['공학', '컴퓨터과학'],
      main_consultant_id: CONSULTANT_1,
      consultant_ids: [CONSULTANT_1],
      parent_id: null,
      user_id: null,
      notes: '탑보딩 Deerfield/Lawrenceville 목표. STEM 강점. NLCS Jeju 비인가 국제학교 재학.',
      status: 'active',
    },
    exams: [
      { exam_type: 'SSAT', exam_date: '2025-11-20', score: '2250', subscores: { Math: '800', Verbal: '720', Reading: '730' }, notes: 'Math perfect score' },
      { exam_type: 'TOEFL', exam_date: '2025-10-05', score: '105', subscores: { Reading: '27', Listening: '26', Speaking: '24', Writing: '28' }, notes: 'Speaking 보강 필요' },
    ],
    gpa: [
      { semester: '1', year: 2025, gpa: 3.88, scale: 4.0, school: '노스런던컬리지에잇스쿨 제주(NLCS Jeju)', notes: null },
    ],
    ec: [
      { activity_name: '로보틱스 (WRO 국제대회)', category: '학술/리서치', position: '팀장 / 프로그래머', organization: 'NLCS Jeju Robotics Team', start_date: '2024-03-01', end_date: null, hours_per_week: 8, description: 'WRO(World Robot Olympiad) 국제대회 참가. Python/C++로 로봇 제어 프로그래밍 담당.', achievements: 'WRO 국제대회 은상, WRO Korea 금상' },
      { activity_name: '수영 (전국소년체전)', category: '스포츠', position: '주장', organization: 'NLCS Jeju 수영부 / 제주도 대표', start_date: '2023-03-01', end_date: null, hours_per_week: 10, description: '자유형 100m/200m 전문. 전국소년체전 제주도 대표 출전.', achievements: '전국소년체전 자유형 200m 출전, 제주도 대회 금메달' },
      { activity_name: '코딩 교육 봉사', category: '봉사활동', position: '강사', organization: 'Code for Jeju', start_date: '2024-06-01', end_date: null, hours_per_week: 3, description: '제주 지역 초등학생 대상 Scratch/Python 코딩 교육 봉사. 주 1회 방문 수업.', achievements: '누적 봉사시간 100시간, 수강 학생 30명' },
      { activity_name: '과학영재교육원 수료', category: '학술/리서치', position: '수료생', organization: 'KAIST 과학영재교육원', start_date: '2024-03-01', end_date: '2025-02-28', hours_per_week: 4, description: 'KAIST 과학영재교육원 정보과학 심화과정 1년 수료.', achievements: '수료 인증서, 최우수 프로젝트상' },
      { activity_name: '드론 레이싱 팀장', category: '클럽/동아리', position: '팀장', organization: 'NLCS Jeju Drone Racing Team', start_date: '2025-03-01', end_date: null, hours_per_week: 4, description: 'FPV 드론 레이싱 팀 창설 및 운영. 드론 조립, 프로그래밍, 비행 훈련.', achievements: '전국 청소년 드론 레이싱 대회 3위' },
      { activity_name: '모바일 앱 개발 (출시)', category: '창업/비즈니스', position: '개발자', organization: '개인 프로젝트', start_date: '2025-01-01', end_date: null, hours_per_week: 5, description: 'Flutter로 학생용 시간표 관리 앱 개발 및 App Store/Google Play 출시.', achievements: 'App Store 출시, 다운로드 300건 달성' },
    ],
    assignments: [
      { title: 'TOEFL Speaking 집중 연습', category: '공인시험', status: 'in_progress', description: 'Speaking 24→27+ 목표. 매일 30분 연습.', assigned_date: '2026-03-01', due_date: '2026-04-05' },
      { title: 'Deerfield 지원 에세이', category: '에세이', status: 'todo', description: 'Deerfield 공통 에세이 주제 선택 및 초안', assigned_date: '2026-03-15', due_date: '2026-04-01' },
      { title: '성적증명서 영문 발급', category: '필수서류', status: 'done', description: '하나고 영문 성적증명서 3부 발급', assigned_date: '2026-03-05', due_date: '2026-03-12' },
    ],
    schedules: [
      { title: 'TOEFL 2차 시험', description: '목표 110+', event_date: '2026-04-12', event_time: '08:30', type: '시험', zoom_link: null, status: 'upcoming' },
      { title: '로보틱스 프로젝트 발표 준비 상담', description: 'FRC 경험을 에세이/인터뷰에서 활용하는 방법 논의', event_date: '2026-03-22', event_time: '15:00', type: '상담', zoom_link: null, status: 'upcoming' },
    ],
    notes: [
      { author_id: CONSULTANT_1, author_name: '최지용', note_date: '2026-03-05', content: '박민준 학생 상담. STEM 역량은 탄탄하나 TOEFL Speaking이 약점. 인터뷰에서도 영향을 줄 수 있으므로 Speaking 집중 훈련 필요. 로보틱스 활동이 Deerfield의 STEM 프로그램과 잘 맞음. 수영 활동은 팀워크와 리더십 소재로 활용.' },
    ],
  },
  {
    student: {
      name: '정하은',
      birth_date: '2010-11-30',
      nationality: '한국',
      school: '브랭섬홀아시아',
      grade: 'G9(Y10)',
      target_countries: ['미국'],
      target_majors: ['국제관계', '정치학'],
      main_consultant_id: CONSULTANT_2,
      consultant_ids: [CONSULTANT_2],
      parent_id: null,
      user_id: null,
      notes: "탑보딩 Miss Porter's/Westover 목표. 다재다능한 프로필.",
      status: 'active',
    },
    exams: [
      { exam_type: 'SSAT', exam_date: '2025-12-10', score: '2340', subscores: { Math: '780', Verbal: '790', Reading: '770' }, notes: '99th percentile' },
      { exam_type: 'TOEFL', exam_date: '2025-11-25', score: '116', subscores: { Reading: '30', Listening: '29', Speaking: '28', Writing: '29' }, notes: 'Near perfect' },
    ],
    gpa: [
      { semester: '1', year: 2025, gpa: 3.98, scale: 4.0, school: '브랭섬홀아시아', notes: 'IB MYP 과정' },
      { semester: '2', year: 2025, gpa: 3.96, scale: 4.0, school: '브랭섬홀아시아', notes: null },
    ],
    ec: [
      { activity_name: '승마 (전국대회 주니어부 우승)', category: '스포츠', position: '주니어부 챔피언', organization: '제주 승마 아카데미 / 대한승마협회', start_date: '2019-06-01', end_date: null, hours_per_week: 6, description: '마장마술(Dressage) 전문. 전국 및 아시아 대회 출전. 주니어부 정상.', achievements: '전국대회 주니어부 우승, 아시아 주니어 대회 입상' },
      { activity_name: '모의유엔 사무총장 (BHAMUN 창설)', category: '리더십', position: 'Secretary-General / Founder', organization: 'BHAMUN (Branksome Hall Asia MUN)', start_date: '2024-03-01', end_date: null, hours_per_week: 5, description: '교내 MUN 대회 BHAMUN 창설 및 사무총장 역할. 아시아 5개국 학교 참가 유치.', achievements: 'BHAMUN 창설, THIMUN Singapore Best Delegate' },
      { activity_name: '미술 (청소년미술대전 특선)', category: '예술/음악', position: '특선 수상자', organization: '대한민국미술대전', start_date: '2018-01-01', end_date: null, hours_per_week: 4, description: '유화 및 수채화 작품 제작. 청소년미술대전 출품 및 개인전 개최.', achievements: '청소년미술대전 특선, 개인전 "Colors of Jeju" 개최' },
      { activity_name: '여성리더십클럽 창설', category: '리더십', position: '창설자 / 회장', organization: 'BHA Women in Leadership Club', start_date: '2025-03-01', end_date: null, hours_per_week: 3, description: '여성 리더십 역량 강화를 위한 교내 클럽 창설. 멘토링 프로그램 및 강연 시리즈 기획.', achievements: '회원 40명 모집, 여성 CEO 초청 강연 시리즈 4회 개최' },
      { activity_name: '아동 교육 봉사활동', category: '봉사활동', position: '봉사 리더', organization: '제주 지역아동센터', start_date: '2024-06-01', end_date: null, hours_per_week: 3, description: '제주 지역아동센터에서 초등학생 대상 영어/미술 교육 봉사.', achievements: '누적 봉사시간 150시간, 아동 미술 전시회 기획' },
      { activity_name: 'TEDx Youth 발표자', category: '리더십', position: 'Speaker', organization: 'TEDxYouth@BranksomeHallAsia', start_date: '2025-10-01', end_date: '2025-10-15', hours_per_week: 10, description: '"Breaking Barriers: Young Women Leading Change" 주제로 TEDx 발표.', achievements: 'TEDx 공식 영상 게시, 교내 영감 강연 시리즈 론칭' },
    ],
    assignments: [
      { title: "Miss Porter's 지원 에세이 초안", category: '에세이', status: 'in_progress', description: '"여성 리더십" 주제 에세이 초안 작성. 승마와 MUN 경험 연결.', assigned_date: '2026-03-12', due_date: '2026-03-28' },
      { title: '포트폴리오 미술 작품 사진 촬영', category: '기타', status: 'todo', description: '미술 포트폴리오용 고화질 작품 사진 10점 촬영 및 정리', assigned_date: '2026-03-16', due_date: '2026-04-05' },
    ],
    schedules: [
      { title: "Miss Porter's 인터뷰 준비 세션", description: '모의 인터뷰 진행. 주요 질문 대비.', event_date: '2026-04-02', event_time: '14:00', type: '상담', zoom_link: null, status: 'upcoming' },
    ],
    notes: [
      { author_id: CONSULTANT_2, author_name: '베에리', note_date: '2026-03-12', content: "정하은 학생 상담. SSAT/TOEFL 점수 모두 최상위권으로 시험 준비는 완료 상태. Miss Porter's의 여성 리더십 철학과 학생의 MUN/승마 활동이 잘 연결됨. 미술 포트폴리오도 별도 제출하면 차별화 가능. 인터뷰 준비에 집중할 것." },
    ],
  },
  // ── 아이비리그 준비 (3명) ──
  {
    student: {
      name: '김태양',
      birth_date: '2008-07-04',
      nationality: '한국',
      school: '민족사관고등학교',
      grade: 'G11(Y12)',
      target_countries: ['미국'],
      target_majors: ['물리학', '컴퓨터과학', '수학'],
      main_consultant_id: CONSULTANT_1,
      consultant_ids: [CONSULTANT_1, CONSULTANT_2],
      parent_id: null,
      user_id: null,
      notes: 'Harvard/MIT/Princeton 목표. 물리올림피아드 국가대표.',
      status: 'active',
    },
    exams: [
      { exam_type: 'SAT', exam_date: '2025-10-05', score: '1580', subscores: { 'Evidence-Based Reading': '790', Math: '790' }, notes: 'Near perfect' },
      { exam_type: 'TOEFL', exam_date: '2025-09-20', score: '119', subscores: { Reading: '30', Listening: '30', Speaking: '29', Writing: '30' }, notes: null },
    ],
    gpa: [
      { semester: '1', year: 2025, gpa: 3.98, scale: 4.0, school: '민족사관고등학교', notes: 'AP Physics C, AP Calculus BC 이수' },
      { semester: '2', year: 2025, gpa: 3.96, scale: 4.0, school: '민족사관고등학교', notes: null },
      { semester: '1', year: 2026, gpa: 3.99, scale: 4.0, school: '민족사관고등학교', notes: 'AP Computer Science A 이수' },
    ],
    ec: [
      { activity_name: '국제물리올림피아드(IPhO) 국가대표', category: '학술/리서치', position: '국가대표 (은메달)', organization: '한국물리학회 / IPhO', start_date: '2024-01-01', end_date: null, hours_per_week: 15, description: 'IPhO 국가대표 선발 및 훈련. 이론물리 및 실험물리 심화 학습.', achievements: 'IPhO 은메달, KPhO 금메달, APhO 금메달' },
      { activity_name: '양자컴퓨팅 연구 (KAIST 교수 지도)', category: '학술/리서치', position: '연구 인턴 / 논문 공동저자', organization: 'KAIST 양자정보연구실', start_date: '2025-06-01', end_date: '2025-08-31', hours_per_week: 20, description: 'KAIST 양자정보연구실 여름 인턴. 양자 오류 정정 코드에 관한 연구 참여. 지도교수 직접 멘토링.', achievements: '공동저자 논문 1편 제출 (arXiv preprint), 학회 포스터 발표' },
      { activity_name: 'AI 교육 스타트업 CEO', category: '창업/비즈니스', position: 'CEO & Co-founder', organization: 'EduQuantum', start_date: '2025-03-01', end_date: null, hours_per_week: 8, description: 'AI 기반 물리 학습 플랫폼 개발. GPT API 활용한 문제 풀이 튜터 개발. 사용자 500명 달성.', achievements: '사용자 500명 달성, 청소년 창업 경진대회 최우수상' },
      { activity_name: '전국과학토론대회 우승', category: '학술/리서치', position: '우승팀 대표', organization: '한국과학창의재단', start_date: '2025-04-01', end_date: '2025-06-30', hours_per_week: 6, description: '전국과학토론대회 본선 진출 및 우승. 양자역학의 실생활 응용 주제 발표.', achievements: '전국과학토론대회 우승, 과학기술정보통신부 장관상 수상' },
      { activity_name: '첼로 (Carnegie Hall 초청 연주)', category: '예술/음악', position: '솔리스트', organization: '민사고 오케스트라 / Carnegie Hall', start_date: '2018-03-01', end_date: null, hours_per_week: 5, description: '첼로 10년 경력. 민사고 오케스트라 수석. Carnegie Hall 청소년 초청 연주 참가.', achievements: 'Carnegie Hall Weill Recital Hall 초청 연주, 전국 학생 음악 콩쿠르 대상' },
      { activity_name: '한국수학올림피아드(KMO) 금상', category: '학술/리서치', position: '금상 수상자', organization: '대한수학회', start_date: '2023-03-01', end_date: '2024-12-31', hours_per_week: 8, description: 'KMO 본선 진출 및 금상 수상. 물리올림피아드와 병행하며 수리적 사고 강화.', achievements: 'KMO 금상, AMC 12 상위 1%' },
      { activity_name: '과학영재교육원 수석 수료', category: '학술/리서치', position: '수석 수료', organization: 'KAIST 과학영재교육원', start_date: '2023-03-01', end_date: '2024-02-28', hours_per_week: 4, description: 'KAIST 과학영재교육원 물리 심화과정 수석 수료.', achievements: '수석 수료, 우수 연구 논문 발표상' },
      { activity_name: '교내 AI 연구동아리 창설', category: '클럽/동아리', position: '창설자 / 회장', organization: '민사고 AI Research Club', start_date: '2025-03-01', end_date: null, hours_per_week: 4, description: '교내 AI 연구동아리 창설. 머신러닝/딥러닝 스터디 및 프로젝트 진행.', achievements: '회원 25명, 교내 AI 해커톤 개최, 3개 프로젝트 출시' },
    ],
    assignments: [
      { title: 'Common App 에세이 최종본', category: '에세이', status: 'in_progress', description: '물리올림피아드 경험과 양자컴퓨팅 연구를 연결하는 에세이. 3차 수정 중.', assigned_date: '2026-02-20', due_date: '2026-03-30' },
      { title: 'MIT 추가 에세이 5편', category: '에세이', status: 'todo', description: 'MIT 추가 에세이 작성. 각 250자 이내.', assigned_date: '2026-03-15', due_date: '2026-04-15' },
      { title: '교수 추천서 요청', category: '필수서류', status: 'done', description: 'KAIST 지도교수님 추천서 요청 완료', assigned_date: '2026-03-01', due_date: '2026-03-10' },
    ],
    schedules: [
      { title: 'Harvard 인터뷰', description: 'Alumni 인터뷰. 서울 호텔에서 대면.', event_date: '2026-04-10', event_time: '14:00', type: '인터뷰', zoom_link: null, status: 'upcoming' },
      { title: 'Common App 에세이 최종 리뷰', description: '최지용 컨설턴트와 에세이 최종 점검', event_date: '2026-03-25', event_time: '17:00', type: '상담', zoom_link: null, status: 'upcoming' },
    ],
    notes: [
      { author_id: CONSULTANT_1, author_name: '최지용', note_date: '2026-03-15', content: '김태양 학생 정기 상담. Harvard/MIT/Princeton 3개교 동시 지원 전략 확정. 물리올림피아드 + KAIST 연구 + 스타트업이 매우 강력한 스파이크. Common App 에세이에서 "물리학을 통해 세상을 이해하려는 여정" 주제로 집중. MIT 에세이는 기술적 깊이를 보여줄 것. Princeton은 community engagement 강조.' },
    ],
  },
  {
    student: {
      name: '오지수',
      birth_date: '2008-12-11',
      nationality: '한국',
      school: '대원외국어고등학교',
      grade: 'G11(Y12)',
      target_countries: ['미국'],
      target_majors: ['정치학', '국제관계', '법학'],
      main_consultant_id: CONSULTANT_2,
      consultant_ids: [CONSULTANT_2, CONSULTANT_1],
      parent_id: null,
      user_id: null,
      notes: 'Yale/Columbia/UPenn 목표. 토론/인권활동 강점.',
      status: 'active',
    },
    exams: [
      { exam_type: 'SAT', exam_date: '2025-10-05', score: '1560', subscores: { 'Evidence-Based Reading': '790', Math: '770' }, notes: null },
      { exam_type: 'TOEFL', exam_date: '2025-09-15', score: '117', subscores: { Reading: '30', Listening: '29', Speaking: '29', Writing: '29' }, notes: null },
    ],
    gpa: [
      { semester: '1', year: 2025, gpa: 3.95, scale: 4.0, school: '대원외국어고등학교', notes: 'AP US History, AP Gov 이수' },
      { semester: '2', year: 2025, gpa: 3.93, scale: 4.0, school: '대원외국어고등학교', notes: null },
      { semester: '1', year: 2026, gpa: 3.96, scale: 4.0, school: '대원외국어고등학교', notes: 'AP World History 이수' },
    ],
    ec: [
      { activity_name: '전국영어토론대회 챔피언 (세계대회 한국대표)', category: '학술/리서치', position: '전국 챔피언 / 한국대표', organization: 'Korea National Debate League / WSDC', start_date: '2023-09-01', end_date: null, hours_per_week: 10, description: '영어 토론(Parliamentary Debate) 전국대회 우승. 세계학교토론대회(WSDC) 한국대표 선발.', achievements: '2025 전국영어토론대회 챔피언, WSDC 한국대표' },
      { activity_name: 'NYMUN Outstanding Delegate', category: '리더십', position: 'Outstanding Delegate', organization: 'New York Model United Nations (NYMUN)', start_date: '2025-01-01', end_date: '2025-01-15', hours_per_week: 20, description: '뉴욕 유엔 본부에서 개최된 NYMUN 참가. Security Council 위원회 대표.', achievements: 'NYMUN Outstanding Delegate Award' },
      { activity_name: '국제앰네스티 청소년위원회 위원장', category: '봉사활동', position: '위원장', organization: 'Amnesty International Korea Youth', start_date: '2024-06-01', end_date: null, hours_per_week: 5, description: '국제앰네스티 한국지부 청소년위원회 위원장. 인권 캠페인 기획 및 청소년 인권 교육 프로그램 운영.', achievements: '청소년 인권 교육 프로그램 10회 개최, 참가자 500명' },
      { activity_name: '장편소설 탈고 (출판사 제출)', category: '학술/리서치', position: '작가', organization: '개인 프로젝트', start_date: '2024-09-01', end_date: '2025-12-31', hours_per_week: 6, description: '인권을 주제로 한 장편소설(12만 자) 집필 완료. 국내 문학 출판사에 원고 제출.', achievements: '장편소설 탈고 완료, 출판사 검토 중' },
      { activity_name: '정치외교학 연구 (연세대 교수 지도)', category: '학술/리서치', position: '연구 조교', organization: '연세대학교 정치외교학과', start_date: '2025-07-01', end_date: '2025-12-31', hours_per_week: 8, description: '연세대 정치외교학과 교수 지도하에 "한국 청소년의 정치 참여 의식" 연구 참여.', achievements: '학부 학술지 논문 게재 예정, 학회 포스터 발표' },
      { activity_name: '학생회장', category: '리더십', position: '학생회장', organization: '대원외국어고등학교 학생회', start_date: '2025-03-01', end_date: null, hours_per_week: 6, description: '전교 학생회장으로서 학생 자치 활동 총괄. 학생 인권 헌장 제정.', achievements: '학생 인권 헌장 제정, 교내 토론 문화 활성화' },
      { activity_name: '국제인권법 스터디 창설', category: '클럽/동아리', position: '창설자 / 대표', organization: '대원외고 International Human Rights Law Study', start_date: '2025-03-01', end_date: null, hours_per_week: 3, description: '국제인권법 스터디 그룹 창설. 유엔 인권 조약 및 판례 분석 세미나 진행.', achievements: '회원 20명, 국제인권법 세미나 12회 개최' },
      { activity_name: '영어교육 봉사 (지역아동센터)', category: '봉사활동', position: '교육 봉사자', organization: '서울 동대문구 지역아동센터', start_date: '2024-03-01', end_date: null, hours_per_week: 3, description: '지역아동센터 초등학생 대상 영어 교육 봉사. 영어 동화 읽기 및 회화 수업.', achievements: '누적 봉사시간 130시간, 학생 15명 지도' },
    ],
    assignments: [
      { title: 'Yale 에세이 "Why Yale?"', category: '에세이', status: 'in_progress', description: 'Yale의 토론 문화와 본인의 토론 경험을 연결하는 에세이', assigned_date: '2026-03-10', due_date: '2026-04-01' },
      { title: 'Columbia Core Curriculum 에세이', category: '에세이', status: 'todo', description: 'Columbia Core Curriculum에 대한 관심 표현. 인문학적 깊이 어필.', assigned_date: '2026-03-16', due_date: '2026-04-10' },
      { title: '활동 수상 내역 정리', category: '기타', status: 'done', description: '토론, MUN, 인권활동 수상 내역 및 인증서 스캔 정리', assigned_date: '2026-03-01', due_date: '2026-03-14' },
    ],
    schedules: [
      { title: 'Yale 인터뷰 (Zoom)', description: 'Yale Alumni 인터뷰. 인권 활동 중심 준비.', event_date: '2026-04-08', event_time: '11:00', type: '인터뷰', zoom_link: 'https://zoom.us/j/example', status: 'upcoming' },
    ],
    notes: [
      { author_id: CONSULTANT_2, author_name: '베에리', note_date: '2026-03-10', content: '오지수 학생 상담. 토론 + MUN + 인권활동이 일관된 "글로벌 시민의식" 테마를 형성. Yale의 "light and truth" 정신과 잘 맞음. Columbia는 Core Curriculum과 뉴욕이라는 도시 환경 활용. UPenn은 Wharton과 정치학 연계(PPE) 강조. 각 학교별 에세이 차별화 전략 수립 완료.' },
    ],
  },
  {
    student: {
      name: '최윤서',
      birth_date: '2009-04-08',
      nationality: '한국',
      school: '채드윅 송도국제학교(Chadwick International)',
      grade: 'G10(Y11)',
      target_countries: ['미국'],
      target_majors: ['신경과학', '심리학', '생물학'],
      main_consultant_id: CONSULTANT_1,
      consultant_ids: [CONSULTANT_1, CONSULTANT_2],
      parent_id: null,
      user_id: null,
      notes: 'Brown/Dartmouth/Cornell 목표. 뇌과학 연구 + 사회공헌 프로필. 채드윅 송도 비인가 국제학교 재학.',
      status: 'active',
    },
    exams: [
      { exam_type: 'SAT', exam_date: '2025-12-07', score: '1530', subscores: { 'Evidence-Based Reading': '760', Math: '770' }, notes: '1차 시험. 2차 목표 1560+' },
      { exam_type: 'TOEFL', exam_date: '2025-11-01', score: '115', subscores: { Reading: '29', Listening: '29', Speaking: '28', Writing: '29' }, notes: null },
    ],
    gpa: [
      { semester: '1', year: 2025, gpa: 3.94, scale: 4.0, school: '채드윅 송도국제학교(Chadwick International)', notes: 'AP Biology, AP Psychology 이수' },
      { semester: '2', year: 2025, gpa: 3.92, scale: 4.0, school: '채드윅 송도국제학교(Chadwick International)', notes: null },
    ],
    ec: [
      { activity_name: '서울대 뇌과학 연구 인턴 (논문 공동저자 예정)', category: '학술/리서치', position: '연구 인턴 / 논문 공동저자', organization: '서울대학교 뇌인지과학연구실', start_date: '2025-07-01', end_date: '2025-12-31', hours_per_week: 12, description: '청소년 수면 패턴과 인지 기능의 상관관계 연구. EEG 데이터 분석 담당. 지도교수 직접 멘토링.', achievements: '한국뇌신경과학회 포스터 발표, 공동저자 논문 투고 예정' },
      { activity_name: '청소년 정신건강 SNS 캠페인', category: '봉사활동', position: '캠페인 설립자', organization: 'MindBridge Korea', start_date: '2025-03-01', end_date: null, hours_per_week: 5, description: '청소년 정신건강 인식 제고를 위한 SNS 캠페인 운영. 뇌과학 연구를 일반인 눈높이로 전달. 학교 방문 강연.', achievements: 'Instagram 팔로워 12,000명, 15개 고등학교 방문 강연, 교육부 장관 표창' },
      { activity_name: '국립발레단 청소년단원 (수석무용수)', category: '예술/음악', position: '수석무용수', organization: '국립발레단 청소년 프로그램', start_date: '2015-01-01', end_date: null, hours_per_week: 8, description: '국립발레단 청소년 프로그램 수석무용수. 클래식 발레 11년 경력. 정기 공연 솔리스트.', achievements: '전국 청소년 발레 콩쿠르 금상, 국립발레단 정기공연 솔로 출연' },
      { activity_name: '청소년 또래상담', category: '봉사활동', position: '또래상담사', organization: '채드윅 송도 Peer Counseling Program', start_date: '2025-03-01', end_date: null, hours_per_week: 4, description: '교내 또래상담 프로그램 참여. 심리상담 기초 교육 이수 후 학생 50명 상담.', achievements: '또래상담 자격증 취득, 학생 50명 상담 완료' },
      { activity_name: '전교 학생회장 (교육부 청소년 자문위원)', category: '리더십', position: '학생회장 / 교육부 청소년 자문위원', organization: '채드윅 송도국제학교 / 교육부', start_date: '2025-09-01', end_date: null, hours_per_week: 6, description: '전교 학생회장으로서 학생 자치 활동 총괄. 교육부 청소년 정책 자문위원 위촉.', achievements: '교육부 청소년 자문위원 위촉, 학생 복지 예산 30% 증액' },
      { activity_name: 'AP Biology 과외 교사', category: '봉사활동', position: '튜터', organization: '개인 튜터링', start_date: '2025-06-01', end_date: null, hours_per_week: 4, description: '후배 학생 15명 대상 AP Biology 과외 지도. 시험 대비 스터디 그룹 운영.', achievements: '수강생 평균 AP 점수 4.5 달성, 5점 비율 60%' },
      { activity_name: '정신건강 논문 리뷰 클럽 창설', category: '클럽/동아리', position: '창설자 / 대표', organization: 'Chadwick Neuroscience Journal Club', start_date: '2025-09-01', end_date: null, hours_per_week: 2, description: '정신건강 및 뇌과학 관련 최신 논문 리뷰 클럽 창설. 격주 세미나 운영.', achievements: '회원 15명, 논문 리뷰 세미나 10회 개최' },
      { activity_name: '뇌과학 올림피아드 은상', category: '학술/리서치', position: '은상 수상자', organization: 'Korea Brain Bee / International Brain Bee', start_date: '2025-03-01', end_date: '2025-06-30', hours_per_week: 5, description: '한국 뇌과학 올림피아드(Korea Brain Bee) 참가. 신경과학 지식 경시대회.', achievements: '뇌과학 올림피아드 은상, 국제대회 한국대표 후보' },
    ],
    assignments: [
      { title: 'SAT 2차 시험 준비', category: '공인시험', status: 'in_progress', description: '목표 1560+. Reading 섹션 보강. 매주 모의시험 1회.', assigned_date: '2026-03-01', due_date: '2026-05-01' },
      { title: 'Brown 에세이 구상', category: '에세이', status: 'todo', description: "Brown의 Open Curriculum과 본인의 학제간 관심(뇌과학+심리학+예술) 연결", assigned_date: '2026-03-16', due_date: '2026-04-20' },
      { title: '연구 논문 초록 영문 번역', category: '기타', status: 'in_progress', description: '서울대 뇌과학 연구 논문 초록을 영문으로 번역하여 활동 기록에 추가', assigned_date: '2026-03-10', due_date: '2026-03-25' },
    ],
    schedules: [
      { title: 'SAT 2차 시험', description: '목표 1560+', event_date: '2026-05-03', event_time: '08:00', type: '시험', zoom_link: null, status: 'upcoming' },
      { title: '뇌과학 연구 & 에세이 상담', description: '연구 경험을 에세이에 녹이는 전략 논의', event_date: '2026-03-30', event_time: '16:00', type: '상담', zoom_link: null, status: 'upcoming' },
    ],
    notes: [
      { author_id: CONSULTANT_1, author_name: '최지용', note_date: '2026-03-16', content: '최윤서 학생 상담. 뇌과학 연구 + 발레 + 정신건강 캠페인이 "마음과 몸의 과학" 이라는 독특한 테마를 형성. Brown의 Open Curriculum이 이 학제간 관심사에 가장 적합. Dartmouth는 소규모 리서치 커뮤니티, Cornell은 뇌과학 프로그램 강점으로 차별화. SAT 2차에서 1560+ 달성이 우선 과제.' },
    ],
  },
]

// ── Main ────────────────────────────────────────────────────
async function main() {
  console.log('=== 샘플 데이터 생성 시작 ===\n')

  for (const s of students) {
    // 1. Create student
    const studentRef = db.collection('students').doc()
    const studentId = studentRef.id
    await studentRef.set({
      id: studentId,
      ...s.student,
      created_at: NOW,
      updated_at: NOW,
    })
    console.log(`[학생] ${s.student.name} (${studentId})`)

    // 2. Exams
    for (const exam of s.exams) {
      const ref = db.collection('exams').doc()
      await ref.set({
        id: ref.id,
        student_id: studentId,
        ...exam,
        created_at: NOW,
      })
    }
    console.log(`  - 시험 ${s.exams.length}건`)

    // 3. GPA records
    for (const gpa of s.gpa) {
      const ref = db.collection('gpa_records').doc()
      await ref.set({
        id: ref.id,
        student_id: studentId,
        ...gpa,
        created_at: NOW,
      })
    }
    console.log(`  - GPA ${s.gpa.length}건`)

    // 4. EC Activities
    for (const ec of s.ec) {
      const ref = db.collection('ec_activities').doc()
      await ref.set({
        id: ref.id,
        student_id: studentId,
        ...ec,
        created_at: NOW,
      })
    }
    console.log(`  - EC활동 ${s.ec.length}건`)

    // 5. Assignments
    for (const a of s.assignments) {
      const ref = db.collection('assignments').doc()
      await ref.set({
        id: ref.id,
        student_id: studentId,
        ...a,
        created_at: NOW,
        updated_at: NOW,
      })
    }
    console.log(`  - 과제 ${s.assignments.length}건`)

    // 6. Schedules
    for (const sc of s.schedules) {
      const ref = db.collection('schedules').doc()
      await ref.set({
        id: ref.id,
        student_id: studentId,
        ...sc,
        created_at: NOW,
      })
    }
    console.log(`  - 일정 ${s.schedules.length}건`)

    // 7. Consult notes
    for (const n of s.notes) {
      const ref = db.collection('consult_notes').doc()
      await ref.set({
        id: ref.id,
        student_id: studentId,
        ...n,
        created_at: NOW,
        updated_at: NOW,
      })
    }
    console.log(`  - 상담노트 ${s.notes.length}건`)

    console.log('')
  }

  console.log('=== 샘플 데이터 생성 완료 ===')
  console.log(`총 ${students.length}명의 학생 데이터가 추가되었습니다.`)
  process.exit(0)
}

main().catch(err => {
  console.error('Error:', err)
  process.exit(1)
})
