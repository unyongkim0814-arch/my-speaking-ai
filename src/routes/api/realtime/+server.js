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

		// 클라이언트에서 전달된 언어 설정 및 커스텀 프롬프트 받기
		const body = await request.json().catch(() => ({}));
		const language = body.language || 'ko'; // 기본값: 한국어
		const customPrompt = body.customPrompt; // 커스텀 프롬프트

		// 기본 언어별 설정
		const languageConfig = {
			ko: {
				voice: 'shimmer',
				instructions: '당신은 친근한 한국어 대화 상대입니다. 사용자와 자연스럽게 한국어로 대화하세요. 대화는 간결하고 친근하게 유지하세요. 필요한 경우 발음이나 문법에 대한 피드백을 제공할 수 있습니다.'
			},
			en: {
				voice: 'alloy',
				instructions: 'You are a friendly English conversation tutor. Help the user practice English conversation. Speak naturally and provide helpful feedback on their pronunciation and grammar. Keep responses concise and engaging. Use simple, clear English appropriate for language learners.'
			}
		};

		const config = languageConfig[language] || languageConfig.ko;
		
		// 커스텀 프롬프트가 있으면 사용, 없으면 기본값 사용
		if (customPrompt) {
			config.instructions = customPrompt;
		}

		// REST API를 직접 호출하여 Ephemeral key 생성
		const apiResponse = await fetch('https://api.openai.com/v1/realtime/client_secrets', {
			method: 'POST',
			headers: {
				'Authorization': `Bearer ${OPENAI_API_KEY}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				expires_after: {
					anchor: 'created_at',
					seconds: 600  // 10분 유효
				},
				session: {
					type: 'realtime',
					model: 'gpt-realtime',
					instructions: config.instructions,
					output_modalities: ['audio'],
					audio: {
						input: {
							format: {
								type: 'audio/pcm',
								rate: 24000
							},
							transcription: {
								model: 'whisper-1'
							},
							turn_detection: {
								type: 'server_vad',
								threshold: 0.5,
								prefix_padding_ms: 300,
								silence_duration_ms: 200
							}
						},
						output: {
							format: {
								type: 'audio/pcm',
								rate: 24000
							},
							voice: config.voice
						}
					}
				}
			})
		});

		if (!apiResponse.ok) {
			const errorData = await apiResponse.json().catch(() => ({}));
			console.error('OpenAI API 오류:', errorData);
			throw new Error(errorData.error?.message || `API 오류: ${apiResponse.status}`);
		}

		const responseData = await apiResponse.json();
		console.log('OpenAI API 응답:', {
			hasValue: !!responseData.value,
			expiresAt: responseData.expires_at,
			sessionType: responseData.session?.type
		});
		
		// 응답에서 client secret 추출
		const clientSecret = responseData.value;
		
		if (!clientSecret) {
			console.error('Client secret을 찾을 수 없습니다:', responseData);
			throw new Error('Client secret을 받지 못했습니다.');
		}
		
		return json({ clientSecret });
	} catch (error) {
		console.error('Realtime API 오류:', error);
		return json(
			{ error: error.message || '서버 오류가 발생했습니다.' },
			{ status: 500 }
		);
	}
}
