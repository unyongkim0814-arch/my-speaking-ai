import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

/** @type {import('./$types').RequestHandler} */
export async function POST({ request }) {
	try {
		// SvelteKit의 환경 변수 접근 방법 사용
		const OPENAI_API_KEY = env.OPENAI_API_KEY;

		if (!OPENAI_API_KEY) {
			console.error('환경 변수 확인:', {
				hasKey: !!env.OPENAI_API_KEY,
				envKeys: Object.keys(env).filter(k => k.includes('OPENAI'))
			});
			return json(
				{ 
					error: 'OPENAI_API_KEY가 환경 변수에 설정되지 않았습니다.\n\n' +
					       '프로젝트 루트에 .env 파일을 생성하고 다음을 추가하세요:\n' +
					       'OPENAI_API_KEY=your-api-key-here'
				},
				{ status: 500 }
			);
		}

		// Realtime 세션 설정 (최소 파라미터)
		const sessionConfig = {
			session: {
				type: 'realtime',
				model: 'gpt-realtime'
			}
		};

		// REST API를 직접 호출하여 Ephemeral key 생성
		const apiResponse = await fetch('https://api.openai.com/v1/realtime/client_secrets', {
			method: 'POST',
			headers: {
				'Authorization': `Bearer ${OPENAI_API_KEY}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(sessionConfig)
		});

		if (!apiResponse.ok) {
			const errorData = await apiResponse.json().catch(() => ({}));
			console.error('OpenAI API 오류:', errorData);
			throw new Error(errorData.error?.message || `API 오류: ${apiResponse.status}`);
		}

		const responseData = await apiResponse.json();
		return json({ clientSecret: responseData.value });
	} catch (error) {
		console.error('Realtime API 오류:', error);
		return json(
			{ error: error.message || '서버 오류가 발생했습니다.' },
			{ status: 500 }
		);
	}
}
