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
-- - content: 회화 내용 (JSON 형식)
-- - created_at: 기록 일시
-- ========================================
