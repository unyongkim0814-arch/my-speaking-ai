import { supabase } from './supabaseClientBrowser';

/**
 * 대화 세션을 Supabase에 저장
 * @param {string} userId - 사용자 ID
 * @param {string} conversationText - 대화 내용
 * @param {Array} debugLogs - 디버그 로그 (선택사항)
 * @returns {Promise<Object>} 저장된 대화 데이터
 */
export async function saveConversation(userId, conversationText, debugLogs = []) {
	try {
		// 대화 내용을 구조화된 형태로 저장
		const content = {
			text: conversationText,
			messages: parseConversationText(conversationText),
			metadata: {
				savedAt: new Date().toISOString(),
				messageCount: countMessages(conversationText)
			}
		};

		const { data, error } = await supabase
			.from('conversations')
			.insert([
				{
					user_id: userId,
					content: content
				}
			])
			.select()
			.single();

		if (error) throw error;
		
		return data;
	} catch (error) {
		console.error('대화 저장 오류:', error);
		throw error;
	}
}

/**
 * 사용자의 모든 대화 기록 조회 (최신순)
 * @param {string} userId - 사용자 ID
 * @param {number} limit - 조회할 개수 (기본: 50)
 * @returns {Promise<Array>} 대화 기록 배열
 */
export async function getConversations(userId, limit = 50) {
	try {
		const { data, error } = await supabase
			.from('conversations')
			.select('*')
			.eq('user_id', userId)
			.order('created_at', { ascending: false })
			.limit(limit);

		if (error) throw error;
		
		return data || [];
	} catch (error) {
		console.error('대화 기록 조회 오류:', error);
		throw error;
	}
}

/**
 * 특정 대화 기록 조회
 * @param {string} conversationId - 대화 ID
 * @returns {Promise<Object>} 대화 데이터
 */
export async function getConversation(conversationId) {
	try {
		const { data, error } = await supabase
			.from('conversations')
			.select('*')
			.eq('id', conversationId)
			.single();

		if (error) throw error;
		
		return data;
	} catch (error) {
		console.error('대화 조회 오류:', error);
		throw error;
	}
}

/**
 * 대화 기록 삭제
 * @param {string} conversationId - 대화 ID
 * @returns {Promise<void>}
 */
export async function deleteConversation(conversationId) {
	try {
		const { error } = await supabase
			.from('conversations')
			.delete()
			.eq('id', conversationId);

		if (error) throw error;
	} catch (error) {
		console.error('대화 삭제 오류:', error);
		throw error;
	}
}

/**
 * 대화 텍스트를 파싱하여 메시지 배열로 변환
 * @param {string} text - 대화 텍스트
 * @returns {Array} 파싱된 메시지 배열
 */
function parseConversationText(text) {
	if (!text) return [];
	
	const messages = [];
	const lines = text.split('\n');
	
	for (const line of lines) {
		// [나]: ... 패턴 추출
		const userMatch = line.match(/^\[나\]:\s*(.+)$/);
		if (userMatch) {
			messages.push({
				role: 'user',
				content: userMatch[1].trim()
			});
			continue;
		}
		
		// [AI]: ... 패턴 추출
		const aiMatch = line.match(/^\[AI\]:\s*(.+)$/);
		if (aiMatch) {
			messages.push({
				role: 'assistant',
				content: aiMatch[1].trim()
			});
			continue;
		}
	}
	
	return messages;
}

/**
 * 대화에서 메시지 개수 카운트
 * @param {string} text - 대화 텍스트
 * @returns {number} 메시지 개수
 */
function countMessages(text) {
	if (!text) return 0;
	
	const userMessages = (text.match(/\[나\]:/g) || []).length;
	const aiMessages = (text.match(/\[AI\]:/g) || []).length;
	
	return userMessages + aiMessages;
}
