# My Speaking AI - 프로젝트 문서

## 📋 목차

1. [프로젝트 개요](#-프로젝트-개요)
2. [주요 기능](#-주요-기능)
3. [기술 스택](#-기술-스택)
4. [시스템 아키텍처](#-시스템-아키텍처)
5. [프로젝트 구조](#-프로젝트-구조)
6. [설치 및 설정](#-설치-및-설정)
7. [사용 방법](#-사용-방법)
8. [데이터베이스 스키마](#-데이터베이스-스키마)
9. [API 문서](#-api-문서)
10. [주요 컴포넌트](#-주요-컴포넌트)
11. [배포](#-배포)
12. [문제 해결](#-문제-해결)
13. [향후 개선사항](#-향후-개선사항)

---

## 🎯 프로젝트 개요

**My Speaking AI**는 OpenAI의 Realtime API를 활용한 실시간 음성 대화 연습 애플리케이션입니다. 한국어와 영어 회화 연습을 위한 AI 튜터와 실시간으로 대화하며 언어 능력을 향상시킬 수 있습니다.

### 핵심 가치

- **실시간 음성 대화**: WebRTC 기반의 저지연 음성 통신
- **맞춤형 학습**: 커스텀 프롬프트로 학습 스타일 조정 가능
- **대화 기록 관리**: 모든 대화 세션을 자동 저장 및 복습 가능
- **다국어 지원**: 한국어와 영어 회화 연습 지원

---

## ✨ 주요 기능

### 1. 사용자 인증
- **Supabase Auth** 기반 이메일/비밀번호 인증
- 안전한 사용자 세션 관리
- Row Level Security (RLS)로 데이터 보안

### 2. 실시간 대화 모드
- **OpenAI Realtime API** 연동
- WebRTC 기반 실시간 음성 통신
- 자동 음성 인식 (Whisper-1)
- 실시간 텍스트 전사 (Transcription)
- 음성 감지 및 자동 응답 (Server VAD)
- AI 음성 볼륨 조절
- 연결 상태 모니터링

### 3. 녹음 모드
- 브라우저 기반 음성 녹음
- 실시간 음파 그래프 시각화
- 녹음 파일 다운로드 (WebM/OGG/MP4 형식)
- 녹음 시간 표시

### 4. 대화 기록 관리
- 모든 대화 세션 자동 저장
- 메시지별 파싱 및 구조화
- AI 설정 정보 저장 (언어, 음성, 모델, 프롬프트)
- 대화 기록 조회 및 삭제
- 대화 내용 상세보기

### 5. 커스텀 프롬프트
- 사용자 정의 AI 시스템 프롬프트
- 언어별 기본 프롬프트 제공
- 로컬스토리지 기반 프롬프트 저장
- 프롬프트 작성 가이드 제공

### 6. 디버그 시스템
- 실시간 로그 수집 및 표시
- 에러 추적 및 분석
- 로그 복사 및 내보내기
- 연결 상태 상세 모니터링

---

## 🛠 기술 스택

### Frontend
- **SvelteKit** 2.49.1 - 프레임워크
- **Svelte** 5.45.6 - UI 라이브러리
- **Tailwind CSS** 4.1.17 - 스타일링
- **Vite** 7.2.6 - 빌드 도구

### Backend & Services
- **OpenAI Realtime API** - 실시간 음성 대화
- **OpenAI Whisper-1** - 음성 인식
- **Supabase** - 인증 및 데이터베이스
- **PostgreSQL** - 데이터 저장소

### Communication
- **WebRTC** - 실시간 음성 통신
- **WebSocket** (DataChannel) - 실시간 이벤트 통신

### Development Tools
- **ESLint** 9.39.1 - 코드 린팅
- **Vitest** 4.0.15 - 유닛 테스트
- **Playwright** 1.57.0 - E2E 테스트

### Deployment
- **Vercel** - 호스팅 및 배포
- **Vercel Adapter** - SvelteKit 어댑터

---

## 🏗 시스템 아키텍처

```
┌─────────────────────────────────────────────────────────────┐
│                         Client (Browser)                      │
├─────────────────────────────────────────────────────────────┤
│  SvelteKit Frontend                                           │
│  ├─ Auth Store (Supabase Auth)                               │
│  ├─ Conversation Store                                        │
│  ├─ WebRTC PeerConnection                                     │
│  └─ MediaRecorder (녹음)                                      │
└────────────┬────────────────────────────┬────────────────────┘
             │                            │
             │ HTTP/REST                  │ WebRTC + DataChannel
             │                            │
┌────────────▼────────────────┐  ┌────────▼─────────────────────┐
│  SvelteKit API Server       │  │   OpenAI Realtime API        │
│  (/api/realtime)            │  │   (WebRTC + DataChannel)     │
│                             │  │                              │
│  - Ephemeral Key 생성       │  │  - 음성 인식 (Whisper)       │
│  - Session 설정             │  │  - 실시간 응답 생성          │
│  - 언어/프롬프트 전달       │  │  - 음성 합성 (TTS)          │
└─────────────────────────────┘  └──────────────────────────────┘
             │
             │ PostgreSQL
             │
┌────────────▼────────────────┐
│      Supabase Backend       │
│                             │
│  - Authentication           │
│  - PostgreSQL Database      │
│  - Row Level Security       │
│  - conversations 테이블     │
└─────────────────────────────┘
```

### 데이터 흐름

1. **인증 흐름**
   ```
   User → SvelteKit → Supabase Auth → JWT Token → Client Store
   ```

2. **실시간 대화 흐름**
   ```
   Client → /api/realtime → OpenAI (Ephemeral Key)
        ↓
   WebRTC Connection 설정
        ↓
   Client ⟷ OpenAI Realtime API (음성 + 데이터 채널)
        ↓
   대화 저장 → Supabase Database
   ```

3. **대화 기록 조회**
   ```
   Client → Supabase Client → PostgreSQL (RLS 적용) → Client
   ```

---

## 📁 프로젝트 구조

```
my-speaking-ai/
├── src/
│   ├── routes/                     # SvelteKit 라우트
│   │   ├── +page.svelte           # 메인 페이지 (녹음 + 실시간 대화)
│   │   ├── +layout.svelte         # 레이아웃 컴포넌트
│   │   ├── layout.css             # 전역 스타일
│   │   ├── api/
│   │   │   └── realtime/
│   │   │       └── +server.js     # Realtime API 서버 엔드포인트
│   │   ├── auth/
│   │   │   ├── callback/
│   │   │   │   └── +page.svelte   # OAuth 콜백
│   │   │   └── confirm/
│   │   │       └── +page.svelte   # 이메일 인증 확인
│   │   ├── history/
│   │   │   └── +page.svelte       # 대화 기록 페이지
│   │   ├── login/
│   │   │   └── +page.svelte       # 로그인 페이지
│   │   └── signup/
│   │       └── +page.svelte       # 회원가입 페이지
│   │
│   ├── lib/                        # 공유 라이브러리
│   │   ├── stores/
│   │   │   └── authStore.js       # 인증 상태 관리
│   │   ├── conversationStore.js   # 대화 저장/조회 로직
│   │   ├── supabaseClient.js      # Supabase 서버 클라이언트
│   │   └── supabaseClientBrowser.js # Supabase 브라우저 클라이언트
│   │
│   └── app.html                    # HTML 템플릿
│
├── static/                         # 정적 파일
│   └── robots.txt
│
├── setup-database.sql              # Supabase 데이터베이스 스키마
├── package.json                    # 프로젝트 의존성
├── svelte.config.js               # SvelteKit 설정
├── vite.config.js                 # Vite 설정
├── eslint.config.js               # ESLint 설정
├── jsconfig.json                  # JavaScript 설정
├── .env.example                   # 환경 변수 예시
├── .gitignore
├── .npmrc
└── README.md                      # 프로젝트 README
```

### 주요 디렉토리 설명

- **`src/routes/`**: SvelteKit의 파일 기반 라우팅 시스템
- **`src/lib/`**: 재사용 가능한 라이브러리 및 유틸리티
- **`src/routes/api/`**: 서버 사이드 API 엔드포인트
- **`static/`**: 빌드 시 그대로 복사되는 정적 파일

---

## 🚀 설치 및 설정

### 1. 사전 요구사항

- Node.js 18+ 
- npm 또는 pnpm
- Supabase 계정
- OpenAI API 키 (Realtime API 접근 권한 필요)

### 2. 프로젝트 클론

```bash
git clone <repository-url>
cd my-speaking-ai
```

### 3. 의존성 설치

```bash
npm install
```

### 4. 환경 변수 설정

`.env` 파일을 생성하고 필요한 값을 입력하세요:

```bash
cp .env.example .env
```

`.env` 파일 내용:

```env
# OpenAI API Key
OPENAI_API_KEY=sk-proj-...

# Supabase (서버 사이드)
SUPABASE_DB_URL=https://your-project.supabase.co
SUPABASE_DB_PUBLIC_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Supabase (클라이언트 사이드)
PUBLIC_SUPABASE_URL=https://your-project.supabase.co
PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### 환경 변수 발급 방법

**OpenAI API 키:**
1. [OpenAI Platform](https://platform.openai.com/api-keys) 접속
2. "Create new secret key" 클릭
3. 생성된 키를 `OPENAI_API_KEY`에 입력

**Supabase 설정:**
1. [Supabase](https://supabase.com) 가입 및 새 프로젝트 생성
2. Settings > API로 이동
3. Project URL과 anon public 키를 복사하여 환경 변수에 입력

### 5. Supabase 데이터베이스 설정

Supabase Dashboard의 SQL Editor에서 `setup-database.sql` 파일의 내용을 실행하세요:

```sql
-- conversations 테이블 생성
-- RLS 정책 설정
-- 인덱스 생성
```

자세한 내용은 [데이터베이스 스키마](#-데이터베이스-스키마) 섹션을 참조하세요.

### 6. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 `http://localhost:5173`로 접속하세요.

### 7. 빌드 (프로덕션)

```bash
npm run build
npm run preview  # 빌드 결과 미리보기
```

---

## 📖 사용 방법

### 1. 회원가입 및 로그인

1. 첫 방문 시 `/signup` 페이지로 이동
2. 이메일과 비밀번호(최소 6자) 입력
3. 회원가입 완료 후 로그인 페이지로 이동
4. 이메일과 비밀번호로 로그인

### 2. 실시간 대화 시작

1. 메인 페이지에서 언어 선택 (🇰🇷 한국어 / 🇺🇸 영어)
2. (선택사항) "⚙️ AI 프롬프트 커스터마이징" 클릭하여 AI 지시사항 설정
3. "💬 실시간 대화 시작" 버튼 클릭
4. 마이크 권한 허용
5. 연결 완료 후 음성으로 대화 시작
6. 대화 종료 시 "연결 종료" 버튼 클릭
7. 대화 내용이 자동으로 저장됨

### 3. 녹음 모드

1. "📼 녹음 모드" 버튼 클릭
2. "녹음 시작" 버튼 클릭
3. 음성 녹음 (실시간 음파 그래프 표시)
4. "녹음 중지" 버튼 클릭
5. 녹음된 파일 재생 또는 다운로드

### 4. 대화 기록 확인

1. 상단의 "📚 대화 기록" 버튼 클릭
2. 저장된 대화 목록 확인
3. "자세히 보기" 클릭하여 대화 내용 상세 보기
4. 필요 시 대화 기록 삭제

### 5. 커스텀 프롬프트 설정

프롬프트 작성 팁:
- AI의 역할을 명확히 정의 (예: "비즈니스 영어 전문 튜터")
- 원하는 대화 스타일 명시 (친근한/격식있는/유머러스한)
- 피드백 방식 지정 (즉시 교정/대화 후 요약)
- 특정 주제 집중 (여행 회화/면접 연습)
- 응답 길이 조절 (간결하게/상세하게)

---

## 🗄 데이터베이스 스키마

### conversations 테이블

대화 세션을 저장하는 메인 테이블입니다.

```sql
CREATE TABLE public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 컬럼 설명

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | UUID | 대화 고유 ID (자동 생성) |
| `user_id` | UUID | 사용자 ID (auth.users 참조) |
| `content` | JSONB | 대화 내용 및 메타데이터 |
| `created_at` | TIMESTAMP | 대화 생성 일시 |

#### content JSONB 구조

```json
{
  "text": "전체 대화 텍스트",
  "messages": [
    {
      "role": "user",
      "content": "사용자 메시지"
    },
    {
      "role": "assistant",
      "content": "AI 응답"
    }
  ],
  "aiSettings": {
    "language": "ko",
    "languageName": "한국어",
    "voice": "shimmer",
    "model": "gpt-realtime",
    "prompt": "AI 시스템 프롬프트",
    "isCustomPrompt": true,
    "sessionStartTime": "2024-01-01T00:00:00.000Z"
  },
  "metadata": {
    "savedAt": "2024-01-01T00:00:00.000Z",
    "messageCount": 10
  }
}
```

### 인덱스

성능 최적화를 위한 인덱스:

```sql
CREATE INDEX conversations_user_id_idx ON public.conversations(user_id);
CREATE INDEX conversations_created_at_idx ON public.conversations(created_at DESC);
```

### Row Level Security (RLS)

사용자는 자신의 데이터만 접근 가능:

```sql
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- SELECT 정책
CREATE POLICY "사용자는 자신의 회화기록만 볼 수 있음" 
ON public.conversations
FOR SELECT 
USING (auth.uid() = user_id);

-- INSERT 정책
CREATE POLICY "사용자는 자신의 회화기록만 생성 가능" 
ON public.conversations
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- DELETE 정책
CREATE POLICY "사용자는 자신의 회화기록만 삭제 가능" 
ON public.conversations
FOR DELETE 
USING (auth.uid() = user_id);
```

---

## 🔌 API 문서

### POST /api/realtime

OpenAI Realtime API와 연결하기 위한 Ephemeral Key를 생성합니다.

#### Request

**Headers:**
```
Content-Type: application/json
```

**Body:**
```json
{
  "language": "ko",  // 'ko' 또는 'en'
  "customPrompt": "사용자 정의 프롬프트 (선택사항)"
}
```

#### Response

**Success (200):**
```json
{
  "clientSecret": "eph_..."
}
```

**Error (500):**
```json
{
  "error": "오류 메시지"
}
```

#### 처리 흐름

1. 환경 변수에서 `OPENAI_API_KEY` 확인
2. 클라이언트로부터 언어 설정 및 커스텀 프롬프트 수신
3. OpenAI API를 호출하여 Ephemeral Key 생성
4. 세션 설정 (언어별 음성, 프롬프트 적용)
5. Client Secret을 클라이언트에 반환

#### 언어별 기본 설정

```javascript
const languageConfig = {
  ko: {
    voice: 'shimmer',
    instructions: '한국어 대화 프롬프트...'
  },
  en: {
    voice: 'alloy',
    instructions: '영어 대화 프롬프트...'
  }
};
```

---

## 🧩 주요 컴포넌트

### 1. authStore.js

사용자 인증 상태를 관리하는 Svelte Store입니다.

#### 주요 함수

- `initAuth()`: 인증 상태 초기화 및 세션 감지
- `signUp(email, password)`: 회원가입
- `signIn(email, password)`: 로그인
- `signOut()`: 로그아웃

#### 사용 예시

```javascript
import { user, signIn } from '$lib/stores/authStore';

// 로그인
await signIn('user@example.com', 'password123');

// 현재 사용자 확인
$user.email // 'user@example.com'
```

### 2. conversationStore.js

대화 세션을 저장하고 조회하는 로직을 담당합니다.

#### 주요 함수

- `saveConversation(userId, text, aiSettings, debugLogs)`: 대화 저장
- `getConversations(userId, limit)`: 대화 목록 조회
- `getConversation(conversationId)`: 특정 대화 조회
- `deleteConversation(conversationId)`: 대화 삭제

#### 사용 예시

```javascript
import { saveConversation } from '$lib/conversationStore';

await saveConversation(
  userId,
  conversationText,
  {
    language: 'ko',
    languageName: '한국어',
    voice: 'shimmer',
    model: 'gpt-realtime',
    prompt: 'AI 프롬프트',
    isCustomPrompt: true,
    sessionStartTime: new Date().toISOString()
  },
  debugLogs
);
```

### 3. +page.svelte (메인 페이지)

실시간 대화 및 녹음 기능을 제공하는 메인 컴포넌트입니다.

#### 주요 기능

**실시간 대화 (`connectRealtime`)**
1. 서버로부터 Ephemeral Key 획득
2. WebRTC PeerConnection 생성
3. 마이크 스트림 추가
4. SDP Offer/Answer 교환
5. 데이터 채널을 통한 이벤트 수신
6. AI 음성 스트림 재생

**이벤트 처리 (`dc.onmessage`)**
- `session.created`: 세션 생성 확인
- `session.updated`: 세션 설정 완료
- `input_audio_buffer.speech_started`: 사용자 음성 감지
- `conversation.item.input_audio_transcription.completed`: 음성 인식 결과
- `response.output_audio_transcript.done`: AI 응답 완료
- `error`: 오류 처리

**연결 종료 (`disconnectRealtime`)**
1. 데이터 채널 닫기
2. PeerConnection 종료
3. 마이크 스트림 정지
4. 원격 오디오 정리
5. 대화 내용 자동 저장

### 4. history/+page.svelte

대화 기록을 조회하고 관리하는 페이지입니다.

#### 주요 기능

- 대화 목록 그리드 표시
- 대화 상세보기 모달
- AI 설정 정보 표시
- 대화 기록 삭제
- 시간 포맷팅 (방금 전, N분 전, N시간 전)

---

## 🚢 배포

### Vercel 배포

이 프로젝트는 Vercel에 최적화되어 있습니다.

#### 1. Vercel CLI를 통한 배포

```bash
# Vercel CLI 설치
npm i -g vercel

# 배포
vercel

# 프로덕션 배포
vercel --prod
```

#### 2. GitHub 연동 배포

1. GitHub에 프로젝트 푸시
2. [Vercel Dashboard](https://vercel.com/dashboard)에서 "New Project" 클릭
3. GitHub 저장소 연결
4. 환경 변수 설정
5. 배포 완료

#### 3. 환경 변수 설정 (중요!)

**Vercel Dashboard 방법:**
1. 프로젝트 선택 > Settings > Environment Variables
2. 다음 환경 변수 추가:
   - `OPENAI_API_KEY`
   - `SUPABASE_DB_URL`
   - `SUPABASE_DB_PUBLIC_KEY`
   - `PUBLIC_SUPABASE_URL`
   - `PUBLIC_SUPABASE_ANON_KEY`
3. Environment: Production, Preview, Development 모두 선택
4. Save 후 **반드시 재배포** (Deployments > Redeploy)

**Vercel CLI 방법:**
```bash
vercel env add OPENAI_API_KEY production
# 값 입력 후 재배포
vercel --prod
```

#### 4. 배포 확인

배포 후 다음 사항을 확인하세요:
- [ ] 홈페이지 정상 로드
- [ ] 로그인/회원가입 작동
- [ ] 실시간 대화 연결
- [ ] 대화 기록 저장 및 조회
- [ ] 환경 변수 오류 없음

---

## 🔧 문제 해결

### 1. "OPENAI_API_KEY가 환경 변수에 설정되지 않았습니다"

**원인:**
- 환경 변수가 설정되지 않음
- Vercel에서 재배포하지 않음

**해결:**
```bash
# 로컬 개발
echo "OPENAI_API_KEY=sk-proj-..." >> .env

# Vercel
vercel env add OPENAI_API_KEY production
vercel --prod
```

### 2. "마이크 접근 권한이 필요합니다"

**원인:**
- 브라우저 마이크 권한 거부
- HTTPS가 아닌 환경 (localhost 제외)

**해결:**
- 브라우저 설정에서 마이크 권한 허용
- HTTPS 환경에서 실행 (로컬: localhost는 자동 허용)

### 3. "오디오 재생 실패 (NotAllowedError)"

**원인:**
- 브라우저의 자동 재생 정책

**해결:**
- "🔊 오디오 활성화" 버튼 클릭
- 볼륨 슬라이더 조절하여 재생 재시도

### 4. "대화 저장 실패"

**원인:**
- Supabase 연결 오류
- RLS 정책 미설정

**해결:**
```bash
# 1. Supabase 환경 변수 확인
echo $PUBLIC_SUPABASE_URL
echo $PUBLIC_SUPABASE_ANON_KEY

# 2. setup-database.sql 재실행
# Supabase SQL Editor에서 실행

# 3. RLS 정책 확인
SELECT * FROM pg_policies WHERE tablename = 'conversations';
```

### 5. "WebRTC 연결 실패"

**원인:**
- 방화벽 차단
- 네트워크 제한 (기업/학교 네트워크)

**해결:**
- 다른 네트워크 시도
- VPN 사용
- 브라우저 콘솔에서 상세 오류 확인

### 6. Vercel 배포 후 404 오류

**원인:**
- SvelteKit 어댑터 미설정

**해결:**
```javascript
// svelte.config.js
import adapter from '@sveltejs/adapter-vercel';

export default {
  kit: {
    adapter: adapter()
  }
};
```

### 7. 디버그 로그 활용

모든 연결 및 통신 과정은 디버그 패널에서 확인 가능합니다:

1. 우측 하단 "🔍 디버그 로그" 버튼 클릭
2. 에러 발생 시 자동으로 패널 표시
3. "📋 복사" 버튼으로 로그 내보내기
4. GitHub Issue에 로그 첨부

---

## 🔮 향후 개선사항

### 단기 목표

- [ ] 대화 기록 검색 기능
- [ ] 대화 통계 및 분석 (총 대화 시간, 메시지 수)
- [ ] 다크 모드 지원
- [ ] 모바일 반응형 개선
- [ ] PWA (Progressive Web App) 지원

### 중기 목표

- [ ] 추가 언어 지원 (일본어, 중국어, 스페인어)
- [ ] 대화 주제별 카테고리 분류
- [ ] 음성 발음 평가 및 피드백
- [ ] 대화 내용 PDF/텍스트 내보내기
- [ ] 사용자 학습 진도 대시보드

### 장기 목표

- [ ] AI 튜터 성격/스타일 커스터마이징
- [ ] 실시간 협업 학습 (그룹 대화)
- [ ] 게임화 요소 (포인트, 레벨, 배지)
- [ ] 음성 녹음 자동 전사 및 번역
- [ ] 학습 콘텐츠 추천 시스템

---

## 📚 참고 자료

### 공식 문서

- [OpenAI Realtime API](https://platform.openai.com/docs/guides/realtime)
- [OpenAI Agents SDK](https://openai.github.io/openai-agents-js/)
- [SvelteKit Documentation](https://kit.svelte.dev/)
- [Supabase Documentation](https://supabase.com/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)

### 관련 기술

- [WebRTC API](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API)
- [MediaRecorder API](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder)
- [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)

### 튜토리얼

- [Voice Agents Guide](https://openai.github.io/openai-agents-js/guides/voice-agents/)
- [SvelteKit Authentication](https://kit.svelte.dev/docs/authentication)
- [Supabase Auth with SvelteKit](https://supabase.com/docs/guides/auth/auth-helpers/sveltekit)

---

## 📄 라이선스

이 프로젝트는 개인 학습 및 연구 목적으로 제작되었습니다.

---

## 👥 기여

버그 리포트, 기능 제안, Pull Request는 언제나 환영합니다!

---

## 📞 문의

프로젝트 관련 문의사항은 GitHub Issues를 통해 남겨주세요.

---

**마지막 업데이트:** 2024년 2월 1일
