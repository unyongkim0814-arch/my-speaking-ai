# 대화 기록 기능 가이드

## 개요

영어 회화 연습 내용을 사용자별로 저장하고 나중에 다시 볼 수 있는 기능이 추가되었습니다.

## 데이터베이스 구조

### conversations 테이블
- `id`: 대화 기록 고유 ID (UUID)
- `user_id`: 사용자 ID (auth.users 참조)
- `content`: 대화 내용 (JSONB 형식)
  - `text`: 원본 대화 텍스트
  - `messages`: 파싱된 메시지 배열
  - `metadata`: 메타데이터 (저장 시각, 메시지 개수 등)
- `created_at`: 대화 시작 시각

## 주요 기능

### 1. 자동 저장
- 실시간 대화를 **연결 종료 시 자동으로 저장**합니다.
- 대화 내용이 있는 경우에만 저장됩니다.
- 저장 성공/실패는 대화창에 표시됩니다.

### 2. 수동 저장
- 대화 중에도 **"💾 대화 저장"** 버튼을 눌러 수동으로 저장할 수 있습니다.
- 연결 종료 전에 중간 저장이 가능합니다.

### 3. 대화 기록 조회
- 메인 페이지 상단의 **"📚 대화 기록"** 버튼을 클릭합니다.
- 최신 대화부터 카드 형식으로 표시됩니다.
- 각 카드에는 다음 정보가 표시됩니다:
  - 대화 시각
  - 메시지 개수
  - 대화 시작 내용 미리보기

### 4. 대화 상세 보기
- 카드의 **"자세히 보기"** 버튼을 클릭하면 모달창이 열립니다.
- 사용자와 AI의 대화가 구분되어 표시됩니다:
  - 👤 나 (파란색)
  - 🤖 AI (초록색)

### 5. 대화 삭제
- 각 카드의 **🗑️ 버튼**을 클릭하여 삭제할 수 있습니다.
- 삭제 전 확인 메시지가 표시됩니다.

## 사용 흐름

1. **로그인** → 메인 페이지
2. **실시간 대화 시작** → 영어로 대화 진행
3. **대화 저장** (자동 또는 수동)
4. **대화 기록 페이지** → 저장된 대화 확인
5. **상세 보기** → 대화 내용 복습

## 보안

- **Row Level Security (RLS)** 정책 적용
- 사용자는 자신의 대화 기록만 볼 수 있습니다.
- 다른 사용자의 대화에 접근할 수 없습니다.

## 데이터 형식

### content JSONB 구조 예시
```json
{
  "text": "[나]: Hello, how are you?\n[AI]: I'm doing great! How can I help you practice English today?\n",
  "messages": [
    {
      "role": "user",
      "content": "Hello, how are you?"
    },
    {
      "role": "assistant",
      "content": "I'm doing great! How can I help you practice English today?"
    }
  ],
  "metadata": {
    "savedAt": "2026-02-01T12:34:56.789Z",
    "messageCount": 2
  }
}
```

## 모바일 지원

- 반응형 디자인으로 모바일에서도 최적화되어 표시됩니다.
- 터치 인터페이스를 지원합니다.

## 파일 구조

```
src/
├── lib/
│   └── conversationStore.js          # 대화 저장/조회 유틸리티
├── routes/
│   ├── +page.svelte                  # 메인 페이지 (대화 + 저장 기능)
│   └── history/
│       └── +page.svelte              # 대화 기록 페이지
```

## API 함수

### conversationStore.js

- `saveConversation(userId, conversationText, debugLogs)` - 대화 저장
- `getConversations(userId, limit)` - 대화 목록 조회
- `getConversation(conversationId)` - 특정 대화 조회
- `deleteConversation(conversationId)` - 대화 삭제
