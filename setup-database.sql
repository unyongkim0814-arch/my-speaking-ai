-- ========================================
-- 영어 회화 기록 저장 시스템 데이터베이스 설정
-- Supabase SQL Editor에서 실행하세요
-- ========================================

-- 1. 영어 회화 기록 테이블 생성
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 인덱스 생성 (검색 성능 향상)
CREATE INDEX IF NOT EXISTS conversations_user_id_idx ON public.conversations(user_id);
CREATE INDEX IF NOT EXISTS conversations_created_at_idx ON public.conversations(created_at DESC);

-- 3. Row Level Security (RLS) 활성화
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- 4. RLS 정책 설정 - 사용자는 자신의 데이터만 볼 수 있음
-- 기존 정책이 있으면 먼저 삭제
DROP POLICY IF EXISTS "사용자는 자신의 회화기록만 볼 수 있음" ON public.conversations;
DROP POLICY IF EXISTS "사용자는 자신의 회화기록만 생성 가능" ON public.conversations;
DROP POLICY IF EXISTS "사용자는 자신의 회화기록만 삭제 가능" ON public.conversations;

-- 정책 생성
CREATE POLICY "사용자는 자신의 회화기록만 볼 수 있음" ON public.conversations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "사용자는 자신의 회화기록만 생성 가능" ON public.conversations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "사용자는 자신의 회화기록만 삭제 가능" ON public.conversations
  FOR DELETE USING (auth.uid() = user_id);

-- ========================================
-- 설정 완료!
-- 이제 Supabase Dashboard에서 이 쿼리를 실행하세요.
-- 
-- 테이블 구조:
-- - user_id: auth.users 테이블의 사용자 ID 참조
-- - content: 회화 내용 (JSONB 형식)
--   ├── text: 전체 대화 텍스트
--   ├── messages: 파싱된 메시지 배열 [{role, content}]
--   ├── aiSettings: AI 설정 정보
--   │   ├── language: 언어 코드 (ko/en)
--   │   ├── languageName: 언어 이름 (한국어/영어)
--   │   ├── voice: 음성 설정 (shimmer/alloy)
--   │   ├── model: AI 모델 (gpt-realtime)
--   │   ├── prompt: 사용된 프롬프트
--   │   ├── isCustomPrompt: 커스텀 프롬프트 여부 (boolean)
--   │   └── sessionStartTime: 세션 시작 시간
--   └── metadata: 메타데이터
--       ├── savedAt: 저장 시간
--       └── messageCount: 메시지 개수
-- - created_at: 기록 일시
-- ========================================
