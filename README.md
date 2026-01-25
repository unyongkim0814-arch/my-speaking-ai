# 영어회화 연습 앱 (English Speaking Practice)

OpenAI Realtime API를 사용한 실시간 영어회화 연습 애플리케이션입니다.

## Creating a project

If you're seeing this, you've probably already done this step. Congrats!

```sh
# create a new project
npx sv create my-app
```

To recreate this project with the same configuration:

```sh
# recreate this project
npx sv create --template minimal --no-types --add eslint vitest="usages:unit,component" tailwindcss="plugins:none" sveltekit-adapter="adapter:vercel" --install npm my-speaking-ai
```

## 설정

### 1. 의존성 설치

```sh
npm install
```

### 2. OpenAI API 키 설정

`.env` 파일을 생성하고 OpenAI API 키를 설정하세요:

```sh
cp .env.example .env
```

`.env` 파일을 열어서 API 키를 입력:

```
OPENAI_API_KEY=your-api-key-here
```

OpenAI API 키는 [OpenAI Platform](https://platform.openai.com/api-keys)에서 발급받을 수 있습니다.

### 3. 필요한 패키지 설치

Realtime API를 사용하기 위해 다음 패키지가 필요합니다:

```sh
npm install @openai/agents openai
```

## 개발

의존성을 설치한 후 개발 서버를 시작하세요:

```sh
npm run dev

# 또는 브라우저에서 자동으로 열기
npm run dev -- --open
```

## 기능

### 📼 녹음 모드
- 음성 녹음 및 재생
- 실시간 음파 그래프 표시
- 녹음 파일 다운로드

### 💬 실시간 대화 모드
- OpenAI Realtime API를 사용한 실시간 영어 대화
- 음성 입력 및 음성 응답
- 대화 내용 텍스트 표시
- 영어 회화 튜터와 자연스러운 대화 연습

## 사용 방법

1. **녹음 모드**: 기본 녹음 기능을 사용하여 음성을 녹음하고 재생할 수 있습니다.
2. **실시간 대화 모드**: "실시간 대화 시작" 버튼을 클릭하여 영어 튜터와 실시간으로 대화할 수 있습니다.
   - 마이크 권한이 필요합니다.
   - 연결되면 영어로 말하면 AI 튜터가 응답합니다.
   - 대화 내용이 실시간으로 텍스트로 표시됩니다.

## 참고 문서

- [OpenAI Realtime API](https://platform.openai.com/docs/guides/realtime)
- [OpenAI Agents SDK](https://openai.github.io/openai-agents-js/)
- [Voice Agents Guide](https://openai.github.io/openai-agents-js/guides/voice-agents/)

## Building

To create a production version of your app:

```sh
npm run build
```

You can preview the production build with `npm run preview`.

## 배포 (Vercel)

이 프로젝트는 Vercel에 배포할 수 있도록 설정되어 있습니다.

### Vercel 배포 방법

1. **Vercel에 프로젝트 배포**
   ```sh
   # Vercel CLI 설치 (아직 설치하지 않은 경우)
   npm i -g vercel
   
   # 배포
   vercel
   ```

2. **환경 변수 설정 (중요!)**
   
   로컬의 `.env` 파일은 Vercel 배포 환경에 자동으로 적용되지 않습니다. 
   Vercel에서 환경 변수를 별도로 설정해야 합니다.

   **방법 1: Vercel Dashboard 사용**
   1. [Vercel Dashboard](https://vercel.com/dashboard)에 로그인
   2. 프로젝트 선택
   3. **Settings** 탭 클릭
   4. **Environment Variables** 메뉴 선택
   5. 다음 환경 변수 추가:
      - **Key**: `OPENAI_API_KEY`
      - **Value**: `your-openai-api-key`
      - **Environment**: `Production`, `Preview`, `Development` 모두 선택
   6. **Save** 클릭
   7. **재배포 필요**: 환경 변수 추가 후 반드시 재배포해야 적용됩니다!
      - **Deployments** 탭 → 최신 배포 → 메뉴(⋯) → **Redeploy**

   **방법 2: Vercel CLI 사용**
   ```sh
   # Production 환경 변수 설정
   vercel env add OPENAI_API_KEY production
   
   # 값 입력 후 재배포
   vercel --prod
   ```

3. **환경 변수 확인**
   
   배포 후 다음 URL에 접속하여 환경 변수가 제대로 설정되었는지 확인:
   ```
   https://your-app.vercel.app
   ```
   
   만약 "OPENAI_API_KEY가 환경 변수에 설정되지 않았습니다" 오류가 발생하면:
   - Vercel Dashboard에서 환경 변수가 올바르게 설정되었는지 확인
   - 환경 변수 추가 후 **반드시 재배포**했는지 확인
   - 환경 변수 이름이 정확히 `OPENAI_API_KEY`인지 확인 (대소문자 구분)

### 문제 해결

**Q: 환경 변수를 설정했는데도 오류가 발생해요**
- A: 환경 변수 설정 후 **반드시 재배포**해야 합니다. Vercel Dashboard → Deployments → Redeploy

**Q: 로컬에서는 잘 되는데 Vercel에서만 안 돼요**
- A: 로컬의 `.env` 파일은 Vercel에 업로드되지 않습니다. Vercel Dashboard에서 환경 변수를 별도로 설정해야 합니다.

**Q: 환경 변수가 적용되지 않아요**
- A: Environment 옵션에서 Production, Preview, Development를 모두 선택했는지 확인하세요.
