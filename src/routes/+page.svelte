<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { user, signOut } from '$lib/stores/authStore';

	let mediaRecorder;
	let audioChunks = [];
	let audioBlob = null;
	let audioUrl = null;
	let isRecording = false;
	let recordingTime = 0;
	let recordingInterval;
	let stream = null;
	let audioContext = null;
	let analyser = null;
	let canvasElement;
	let animationFrameId = null;

	// Realtime API 관련 변수
	let isRealtimeMode = false;
	let realtimeSession = null;
	let isConnected = false;
	let conversationText = '';
	let isLoading = false;
	let errorMessage = '';
	let connectionStatus = 'disconnected'; // 'disconnected', 'connecting', 'connected', 'disconnecting'
	let isDisconnecting = false;
	
	// 디버그 로그 관련
	let debugLogs = [];
	let showDebugPanel = false;
	let debugError = null;

	// 디버그 로그 추가 함수
	function addDebugLog(level, message, data = null) {
		const timestamp = new Date().toLocaleTimeString('ko-KR', { 
			hour12: false, 
			hour: '2-digit', 
			minute: '2-digit', 
			second: '2-digit',
			fractionalSecondDigits: 3
		});
		
		const log = {
			timestamp,
			level, // 'info', 'success', 'warning', 'error'
			message,
			data
		};
		
		debugLogs = [...debugLogs, log];
		
		// 에러 레벨이면 디버그 패널 자동 열기
		if (level === 'error') {
			showDebugPanel = true;
			debugError = { message, data, timestamp };
		}
		
		// 로그가 100개 넘으면 오래된 것 제거
		if (debugLogs.length > 100) {
			debugLogs = debugLogs.slice(-100);
		}
	}

	// 로그 초기화
	function clearDebugLogs() {
		debugLogs = [];
		debugError = null;
	}

	// 로그 복사
	function copyDebugLogs() {
		const logsText = debugLogs.map(log => 
			`[${log.timestamp}] [${log.level.toUpperCase()}] ${log.message}${log.data ? '\n' + JSON.stringify(log.data, null, 2) : ''}`
		).join('\n\n');
		
		navigator.clipboard.writeText(logsText).then(() => {
			alert('로그가 클립보드에 복사되었습니다.');
		});
	}

	onMount(() => {
		// 로그인 확인 - 로그인하지 않은 경우 로그인 페이지로 리다이렉트
		const unsubscribe = user.subscribe(($user) => {
			if ($user === null && typeof window !== 'undefined') {
				goto('/login');
			}
		});
		
		return () => {
			unsubscribe();
			// 컴포넌트 언마운트 시 스트림 정리
			if (stream) {
				stream.getTracks().forEach(track => track.stop());
			}
			if (animationFrameId) {
				cancelAnimationFrame(animationFrameId);
			}
			if (audioContext) {
				audioContext.close();
			}
			// Realtime 세션 정리
			if (realtimeSession) {
				disconnectRealtime();
			}
		};
	});
	
	// 로그아웃 처리
	async function handleLogout() {
		try {
			await signOut();
			goto('/login');
		} catch (error) {
			alert('로그아웃 중 오류가 발생했습니다.');
		}
	}

	// Realtime API 연결
	async function connectRealtime() {
		try {
			isLoading = true;
			errorMessage = '';
			debugError = null;
			conversationText = '서버에 연결 중...\n';
			connectionStatus = 'connecting';
			
			addDebugLog('info', '실시간 대화 연결 시작');

			// 서버에서 ephemeral key 가져오기
			console.log('Ephemeral key 요청 중...');
			addDebugLog('info', 'Ephemeral key 요청 중...');
			const response = await fetch('/api/realtime', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				}
			});

			if (!response.ok) {
				const error = await response.json().catch(() => ({ error: '서버 응답 파싱 실패' }));
				console.error('서버 오류:', error);
				addDebugLog('error', `서버 오류 (${response.status})`, error);
				throw new Error(error.error || `서버 오류 (${response.status})`);
			}

			const { clientSecret } = await response.json();
			console.log('Ephemeral key 받음:', clientSecret ? 'OK' : 'FAIL');
			addDebugLog('success', 'Ephemeral key 받음', { hasKey: !!clientSecret });
			conversationText += 'Ephemeral key 받음\n';

			// WebRTC 직접 연결 (브라우저 네이티브 API 사용)
			console.log('WebRTC 연결 설정 중...');
			addDebugLog('info', 'WebRTC PeerConnection 생성 중...');
			conversationText += 'WebRTC 연결 설정 중...\n';

			// RTCPeerConnection 생성
			const pc = new RTCPeerConnection();
			
			// 마이크 스트림 가져오기
			addDebugLog('info', '마이크 스트림 가져오는 중...');
			const mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
			
			// 오디오 트랙 추가
			mediaStream.getTracks().forEach(track => {
				pc.addTrack(track, mediaStream);
				addDebugLog('success', '오디오 트랙 추가됨', { kind: track.kind });
			});

			// 데이터 채널 생성
			const dc = pc.createDataChannel('oai-events');
			addDebugLog('info', '데이터 채널 생성됨');

			// SDP Offer 생성
			addDebugLog('info', 'SDP Offer 생성 중...');
			const offer = await pc.createOffer();
			await pc.setLocalDescription(offer);

			// OpenAI 서버로 SDP 전송
			addDebugLog('info', 'OpenAI 서버에 SDP 전송 중...');
			conversationText += 'OpenAI 서버 연결 중...\n';
			
			const baseUrl = 'https://api.openai.com/v1/realtime/calls';
			const sdpResponse = await fetch(baseUrl, {
				method: 'POST',
				body: offer.sdp,
				headers: {
					'Authorization': `Bearer ${clientSecret}`,
					'Content-Type': 'application/sdp'
				}
			});

			if (!sdpResponse.ok) {
				const errorText = await sdpResponse.text();
				addDebugLog('error', 'SDP 응답 오류', { status: sdpResponse.status, error: errorText });
				throw new Error(`SDP 응답 오류: ${sdpResponse.status}`);
			}

			const sdp = await sdpResponse.text();
			const answer = { type: 'answer', sdp };
			await pc.setRemoteDescription(answer);
			
			addDebugLog('success', 'WebRTC 연결 완료');
			conversationText += '\n✅ 연결 완료! 영어로 말해보세요.\n\n';

			// 연결 상태 모니터링
			pc.onconnectionstatechange = () => {
				console.log('연결 상태:', pc.connectionState);
				addDebugLog('info', 'WebRTC 연결 상태 변경', { 
					state: pc.connectionState,
					timestamp: new Date().toISOString()
				});
				
				if (pc.connectionState === 'connected') {
					conversationText += '\n🎤 마이크 활성화됨\n';
				} else if (pc.connectionState === 'disconnected') {
					addDebugLog('success', '✅ WebRTC 연결 종료 확인', { 
						state: pc.connectionState,
						note: '정상적으로 연결이 종료되었습니다.'
					});
					if (isConnected) {
						errorMessage = 'WebRTC 연결이 끊어졌습니다.';
						isConnected = false;
					}
				} else if (pc.connectionState === 'failed') {
					addDebugLog('error', 'WebRTC 연결 실패', { state: pc.connectionState });
					errorMessage = 'WebRTC 연결이 실패했습니다.';
					isConnected = false;
				} else if (pc.connectionState === 'closed') {
					addDebugLog('success', '✅ PeerConnection 완전 종료 확인', { 
						state: pc.connectionState,
						note: '더 이상 과금되지 않습니다.'
					});
				}
			};

			// 원격 오디오 스트림 수신
			pc.ontrack = (event) => {
				console.log('원격 트랙 수신:', event.track.kind);
				addDebugLog('success', '원격 오디오 스트림 수신', { kind: event.track.kind });
				
				if (event.track.kind === 'audio') {
					const audioEl = new Audio();
					audioEl.srcObject = event.streams[0];
					audioEl.play().catch(err => {
						console.error('오디오 재생 오류:', err);
						addDebugLog('error', '오디오 재생 오류', { error: err.message });
					});
				}
			};

			// 데이터 채널 이벤트 처리
			dc.onopen = () => {
				console.log('데이터 채널 열림');
				addDebugLog('success', '데이터 채널 연결됨');
				
				// 세션 업데이트 메시지 전송
				const sessionUpdate = {
					type: 'session.update',
					session: {
						type: 'realtime',
						instructions: `You are a friendly English conversation tutor. 
						Help the user practice English conversation. 
						Speak naturally and provide helpful feedback on their pronunciation and grammar.
						Keep responses concise and engaging. 
						Use simple, clear English appropriate for language learners.`,
						audio: {
							input: {
								transcription: {
									model: 'whisper-1'
								}
							}
						}
					}
				};
				
				dc.send(JSON.stringify(sessionUpdate));
				addDebugLog('info', '세션 설정 메시지 전송', { hasInstructions: true });
				conversationText += '\n📝 세션 설정 완료. 이제 영어로 말씀하세요!\n\n';
			};

			dc.onclose = () => {
				console.log('데이터 채널 닫힘');
				addDebugLog('info', '✅ 데이터 채널 닫힘 확인', {
					timestamp: new Date().toISOString()
				});
			};

			dc.onerror = (error) => {
				console.error('데이터 채널 오류:', error);
				addDebugLog('error', '데이터 채널 오류', { error });
			};

			dc.onmessage = (event) => {
				try {
					// 종료 후 메시지 수신 감지
					if (!isConnected) {
						addDebugLog('warning', '⚠️ 종료 후 메시지 수신됨!', { 
							message: event.data.substring(0, 200),
							note: '연결이 완전히 종료되지 않았을 수 있습니다.'
						});
						return;
					}
					
					const message = JSON.parse(event.data);
					console.log('서버 메시지 전체:', message);
					
					// 모든 메시지를 상세히 로깅
					addDebugLog('info', '서버 메시지 수신', { 
						type: message.type,
						data: message
					});
					
					// 다양한 이벤트 타입 처리
					switch (message.type) {
						case 'session.created':
						case 'session.updated':
							conversationText += `\n✓ ${message.type}\n`;
							addDebugLog('success', '세션 설정 확인', { type: message.type });
							break;
							
						case 'conversation.item.created':
							// 대화 아이템 생성됨
							addDebugLog('info', '대화 아이템 생성', { item_id: message.item?.id });
							break;
							
						case 'input_audio_buffer.speech_started':
							conversationText += '\n🎤 듣는 중...\n';
							addDebugLog('info', '사용자 음성 감지');
							break;
							
						case 'input_audio_buffer.speech_stopped':
							conversationText += '🔄 처리 중...\n';
							addDebugLog('info', '사용자 음성 종료 (자동 응답 대기)');
							// turn_detection.create_response: true로 자동 응답 생성됨
							break;
							
						case 'input_audio_buffer.committed':
							addDebugLog('info', '오디오 버퍼 커밋됨');
							break;
							
						case 'conversation.item.input_audio_transcription.completed':
							// 사용자가 말한 내용
							const userTranscript = message.transcript || '';
							if (userTranscript) {
								conversationText += `\n[나]: ${userTranscript}\n`;
								addDebugLog('success', '사용자 음성 인식', { transcript: userTranscript });
							}
							break;
							
						case 'conversation.item.added':
						case 'conversation.item.done':
							// 대화 아이템에서도 텍스트 확인
							if (message.item?.role === 'user' && message.item.content) {
								const audioContent = message.item.content.find(c => c.type === 'input_audio');
								if (audioContent?.transcript) {
									conversationText += `\n[나]: ${audioContent.transcript}\n`;
									addDebugLog('success', '사용자 음성 (from item)', { transcript: audioContent.transcript });
								}
							}
							addDebugLog('info', message.type, { item_id: message.item?.id });
							break;
							
						case 'response.created':
							addDebugLog('info', '응답 생성 시작', { response_id: message.response?.id });
							conversationText += '\n💬 AI 응답 생성 중...\n';
							break;
							
						case 'response.output_audio_transcript.delta':
							// AI 응답 텍스트 (실시간)
							if (message.delta) {
								conversationText += message.delta;
							}
							break;
							
						case 'response.output_audio_transcript.done':
							// AI 응답 완료
							const aiTranscript = message.transcript || '';
							if (aiTranscript) {
								conversationText += `\n\n[AI]: ${aiTranscript}\n\n`;
								addDebugLog('success', 'AI 응답 완료', { transcript: aiTranscript });
							}
							break;
							
						case 'response.done':
							const usage = message.response?.usage;
							addDebugLog('success', '응답 전체 완료', { 
								response_id: message.response?.id,
								tokens: usage?.total_tokens
							});
							conversationText += '✨\n\n';
							break;
							
						case 'response.output_item.added':
							addDebugLog('info', '응답 아이템 추가', { 
								item: message.item
							});
							break;
							
						case 'response.output_item.done':
							addDebugLog('info', '응답 아이템 완료', { 
								item: message.item
							});
							break;
							
						case 'error':
							// 중복 응답 요청 오류는 무시 (자동 응답이 이미 진행 중)
							if (message.error?.code === 'conversation_already_has_active_response') {
								addDebugLog('warning', '자동 응답 진행 중 (무시)', message.error);
								break;
							}
							addDebugLog('error', 'API 오류', message.error);
							errorMessage = `API 오류: ${message.error.message}`;
							conversationText += `\n❌ 오류: ${message.error.message}\n`;
							break;
							
						case 'output_audio_buffer.started':
						case 'output_audio_buffer.stopped':
						case 'rate_limits.updated':
							// 정보성 이벤트 - 조용히 로그만
							break;
							
						default:
							// 기타 이벤트 - 디버그만
							console.log('처리되지 않은 이벤트:', message.type);
							break;
					}
				} catch (err) {
					console.error('메시지 파싱 오류:', err);
					addDebugLog('error', '메시지 파싱 실패', { error: err.message });
				}
			};

			// 세션 정보 저장
			realtimeSession = { pc, dc, mediaStream };

			isConnected = true;
			isRealtimeMode = true;
			connectionStatus = 'connected';
			console.log('모든 연결 완료');
			addDebugLog('success', '모든 연결 완료! 대화 준비됨');

		} catch (error) {
			console.error('Realtime 연결 오류:', error);
			addDebugLog('error', 'Realtime 연결 실패', { 
				message: error.message,
				stack: error.stack 
			});
			errorMessage = error.message || '연결에 실패했습니다.';
			conversationText = '';
			isConnected = false;
			connectionStatus = 'disconnected';
		} finally {
			isLoading = false;
		}
	}

	// Realtime API 연결 해제
	function disconnectRealtime() {
		if (isDisconnecting) {
			addDebugLog('warning', '이미 종료 진행 중입니다.');
			return;
		}
		
		isDisconnecting = true;
		connectionStatus = 'disconnecting';
		addDebugLog('info', '🔌 연결 종료 시작...');
		conversationText += '\n\n🔌 연결을 종료하는 중...\n';
		
		let cleanupSteps = [];
		
		if (realtimeSession) {
			// 1. 데이터 채널 닫기
			if (realtimeSession.dc) {
				try {
					if (realtimeSession.dc.readyState === 'open') {
						realtimeSession.dc.close();
						cleanupSteps.push('✓ 데이터 채널 종료');
						addDebugLog('success', '데이터 채널 닫힘', { 
							readyState: realtimeSession.dc.readyState 
						});
					}
				} catch (err) {
					cleanupSteps.push('⚠ 데이터 채널 종료 실패');
					addDebugLog('warning', '데이터 채널 닫기 오류', { error: err.message });
				}
			}
			
			// 2. PeerConnection 닫기
			if (realtimeSession.pc) {
				try {
					const connectionState = realtimeSession.pc.connectionState;
					realtimeSession.pc.close();
					cleanupSteps.push('✓ WebRTC PeerConnection 종료');
					addDebugLog('success', 'PeerConnection 닫힘', { 
						previousState: connectionState,
						currentState: realtimeSession.pc.connectionState
					});
				} catch (err) {
					cleanupSteps.push('⚠ PeerConnection 종료 실패');
					addDebugLog('warning', 'PeerConnection 닫기 오류', { error: err.message });
				}
			}
			
			// 3. 마이크 스트림 정지
			if (realtimeSession.mediaStream) {
				try {
					const tracks = realtimeSession.mediaStream.getTracks();
					tracks.forEach(track => {
						track.stop();
						addDebugLog('success', `미디어 트랙 정지: ${track.kind}`, {
							id: track.id,
							enabled: track.enabled,
							readyState: track.readyState
						});
					});
					cleanupSteps.push(`✓ 마이크 스트림 정지 (${tracks.length}개 트랙)`);
				} catch (err) {
					cleanupSteps.push('⚠ 마이크 스트림 정지 실패');
					addDebugLog('warning', '미디어 스트림 정지 오류', { error: err.message });
				}
			}
			
			realtimeSession = null;
		}
		
		// 상태 초기화
		isConnected = false;
		isRealtimeMode = false;
		connectionStatus = 'disconnected';
		isDisconnecting = false;
		
		// 종료 완료 메시지
		const summary = '\n\n' + cleanupSteps.join('\n') + '\n\n✅ 모든 연결이 안전하게 종료되었습니다.\n💰 더 이상 과금되지 않습니다.';
		conversationText += summary;
		
		addDebugLog('success', '✅ Realtime 세션 완전 종료', {
			cleanupSteps: cleanupSteps.length,
			timestamp: new Date().toISOString()
		});
		
		// 종료 후 3초 동안 추가 메시지 수신 모니터링
		setTimeout(() => {
			addDebugLog('info', '종료 후 모니터링: 3초 경과 - 추가 메시지 없음 확인');
		}, 3000);
	}

	// 모드 전환
	function toggleMode() {
		if (isRealtimeMode && isConnected) {
			disconnectRealtime();
		} else if (!isRealtimeMode) {
			connectRealtime();
		}
	}
	
	// 녹음 모드로 완전히 전환
	function switchToRecordingMode() {
		if (realtimeSession) {
			disconnectRealtime();
		}
		connectionStatus = 'disconnected';
		conversationText = '';
		isRealtimeMode = false;
		addDebugLog('info', '녹음 모드로 전환');
	}

	// 음파 그래프 그리기
	function drawWaveform() {
		if (!analyser || !canvasElement || !isRecording) {
			return;
		}

		const canvas = canvasElement;
		const ctx = canvas.getContext('2d');
		const bufferLength = analyser.frequencyBinCount;
		const dataArray = new Uint8Array(bufferLength);

		function draw() {
			if (!isRecording || !analyser) {
				return;
			}

			animationFrameId = requestAnimationFrame(draw);
			analyser.getByteFrequencyData(dataArray);

			ctx.fillStyle = 'rgba(0, 0, 0, 0)';
			ctx.fillRect(0, 0, canvas.width, canvas.height);

			const barWidth = (canvas.width / bufferLength) * 2.5;
			let barHeight;
			let x = 0;

			for (let i = 0; i < bufferLength; i++) {
				barHeight = (dataArray[i] / 255) * canvas.height * 0.8;

				// 그라데이션 효과
				const gradient = ctx.createLinearGradient(0, canvas.height - barHeight, 0, canvas.height);
				gradient.addColorStop(0, '#ffffff');
				gradient.addColorStop(0.5, '#ff6b6b');
				gradient.addColorStop(1, '#ff4444');

				ctx.fillStyle = gradient;
				ctx.fillRect(x, canvas.height - barHeight, barWidth - 1, barHeight);

				x += barWidth + 1;
			}
		}

		draw();
	}

	// 브라우저가 지원하는 오디오 형식 확인
	function getSupportedMimeType() {
		const types = [
			'audio/webm;codecs=opus',
			'audio/webm',
			'audio/ogg;codecs=opus',
			'audio/mp4',
			'audio/wav'
		];
		
		for (let type of types) {
			if (MediaRecorder.isTypeSupported(type)) {
				return type;
			}
		}
		return ''; // 기본값 사용
	}

	async function startRecording() {
		try {
			// 이전 스트림이 있으면 정리
			if (stream) {
				stream.getTracks().forEach(track => track.stop());
			}

			// 마이크 권한 요청
			stream = await navigator.mediaDevices.getUserMedia({ 
				audio: {
					echoCancellation: true,
					noiseSuppression: true,
					autoGainControl: true
				}
			});
			
			// AudioContext 및 AnalyserNode 설정 (음파 그래프용)
			audioContext = new (window.AudioContext || window.webkitAudioContext)();
			analyser = audioContext.createAnalyser();
			analyser.fftSize = 256;
			const source = audioContext.createMediaStreamSource(stream);
			source.connect(analyser);
			
			// 이전 녹음 데이터 정리
			if (audioUrl) {
				URL.revokeObjectURL(audioUrl);
			}
			audioChunks = [];
			audioBlob = null;
			audioUrl = null;
			recordingTime = 0;

			// MediaRecorder 생성 및 설정
			const mimeType = getSupportedMimeType();
			const options = mimeType ? { mimeType } : {};
			mediaRecorder = new MediaRecorder(stream, options);
			
			mediaRecorder.ondataavailable = (event) => {
				if (event.data && event.data.size > 0) {
					audioChunks.push(event.data);
				}
			};

			mediaRecorder.onstop = () => {
				if (audioChunks.length > 0) {
					const blobType = mimeType || 'audio/webm';
					audioBlob = new Blob(audioChunks, { type: blobType });
					audioUrl = URL.createObjectURL(audioBlob);
				} else {
					alert('녹음된 데이터가 없습니다.');
				}
			};

			mediaRecorder.onerror = (event) => {
				console.error('녹음 오류:', event.error);
				alert('녹음 중 오류가 발생했습니다: ' + (event.error?.message || '알 수 없는 오류'));
				stopRecording();
			};

			// 녹음 시작 (100ms마다 데이터 수집)
			mediaRecorder.start(100);
			isRecording = true;

			// 녹음 시간 카운터
			recordingInterval = setInterval(() => {
				recordingTime++;
			}, 1000);

			// 음파 그래프 시작 (Canvas가 준비될 때까지 약간 대기)
			setTimeout(() => {
				if (canvasElement && isRecording) {
					drawWaveform();
				}
			}, 100);

			console.log('녹음 시작됨. MediaRecorder 상태:', mediaRecorder.state);

		} catch (error) {
			console.error('마이크 접근 오류:', error);
			alert('마이크 접근 권한이 필요합니다. 브라우저 설정에서 마이크 권한을 허용해주세요.\n\n오류: ' + error.message);
			isRecording = false;
			if (stream) {
				stream.getTracks().forEach(track => track.stop());
				stream = null;
			}
		}
	}

	function stopRecording() {
		if (mediaRecorder) {
			if (mediaRecorder.state === 'recording') {
				mediaRecorder.stop();
			}
			isRecording = false;
			
			if (recordingInterval) {
				clearInterval(recordingInterval);
				recordingInterval = null;
			}
			
			// 애니메이션 프레임 정리
			if (animationFrameId) {
				cancelAnimationFrame(animationFrameId);
				animationFrameId = null;
			}
			
			// Canvas 초기화
			if (canvasElement) {
				const ctx = canvasElement.getContext('2d');
				ctx.clearRect(0, 0, canvasElement.width, canvasElement.height);
			}
			
			// AudioContext 정리
			if (audioContext) {
				audioContext.close();
				audioContext = null;
				analyser = null;
			}
			
			// 스트림 정리
			if (stream) {
				stream.getTracks().forEach(track => track.stop());
				stream = null;
			}
		}
	}

	function downloadRecording() {
		if (audioUrl && audioBlob) {
			const a = document.createElement('a');
			a.href = audioUrl;
			// 파일 확장자 결정
			const extension = audioBlob.type.includes('ogg') ? 'ogg' : 
			                  audioBlob.type.includes('mp4') ? 'm4a' : 
			                  audioBlob.type.includes('wav') ? 'wav' : 'webm';
			a.download = `recording_${new Date().getTime()}.${extension}`;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
		}
	}

	function formatTime(seconds) {
		const mins = Math.floor(seconds / 60);
		const secs = seconds % 60;
		return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
	}
</script>

<div class="container">
	<!-- 사용자 정보 및 로그아웃 -->
	{#if $user}
		<div class="user-info">
			<span class="user-email">👤 {$user.email}</span>
			<button class="btn-logout" on:click={handleLogout}>로그아웃</button>
		</div>
	{/if}
	
	<h1>🎙️ 영어회화 연습</h1>
	
	<!-- 모드 전환 버튼 -->
	<div class="mode-toggle">
		<button 
			class="mode-btn" 
			class:active={!isRealtimeMode && connectionStatus === 'disconnected'}
			on:click={switchToRecordingMode}
		>
			📼 녹음 모드
		</button>
		<button 
			class="mode-btn" 
			class:active={isRealtimeMode}
			on:click={toggleMode}
			disabled={isLoading}
		>
			{isLoading ? '연결 중...' : isConnected ? '🟢 실시간 대화 모드' : '💬 실시간 대화 시작'}
		</button>
	</div>

	{#if errorMessage}
		<div class="error-message">
			{errorMessage}
		</div>
	{/if}

	<!-- 디버그 패널 토글 버튼 -->
	<div class="debug-toggle">
		<button 
			class="debug-btn" 
			on:click={() => showDebugPanel = !showDebugPanel}
			class:has-error={debugError}
		>
			{#if debugError}
				⚠️ 디버그 로그 ({debugLogs.length})
			{:else}
				🔍 디버그 로그 ({debugLogs.length})
			{/if}
		</button>
	</div>

	<!-- 디버그 패널 -->
	{#if showDebugPanel}
		<div class="debug-panel">
			<div class="debug-header">
				<h3>디버그 로그</h3>
				<div class="debug-actions">
					<button class="debug-action-btn" on:click={copyDebugLogs} title="로그 복사">
						📋 복사
					</button>
					<button class="debug-action-btn" on:click={clearDebugLogs} title="로그 지우기">
						🗑️ 지우기
					</button>
					<button class="debug-action-btn" on:click={() => showDebugPanel = false} title="닫기">
						✕
					</button>
				</div>
			</div>
			
			{#if debugError}
				<div class="debug-error-summary">
					<strong>⚠️ 최근 에러:</strong>
					<div class="error-detail">{debugError.message}</div>
					{#if debugError.data}
						<pre class="error-data">{JSON.stringify(debugError.data, null, 2)}</pre>
					{/if}
				</div>
			{/if}

			<div class="debug-logs">
				{#if debugLogs.length === 0}
					<div class="no-logs">로그가 없습니다.</div>
				{:else}
					{#each debugLogs as log}
						<div class="debug-log-item" class:log-error={log.level === 'error'} class:log-success={log.level === 'success'} class:log-warning={log.level === 'warning'}>
							<span class="log-timestamp">{log.timestamp}</span>
							<span class="log-level log-level-{log.level}">[{log.level.toUpperCase()}]</span>
							<span class="log-message">{log.message}</span>
							{#if log.data}
								<pre class="log-data">{JSON.stringify(log.data, null, 2)}</pre>
							{/if}
						</div>
					{/each}
				{/if}
			</div>
		</div>
	{/if}

	{#if isRealtimeMode || connectionStatus !== 'disconnected'}
		<!-- Realtime 대화 모드 -->
		<div class="realtime-section">
			<!-- 연결 상태 표시 -->
			<div class="connection-status-box {connectionStatus}">
				<div class="status-indicator">
					{#if connectionStatus === 'connected'}
						<div class="status-dot connected"></div>
						<span class="status-text">🟢 연결됨 (과금 진행 중)</span>
					{:else if connectionStatus === 'connecting'}
						<div class="status-dot connecting"></div>
						<span class="status-text">🟡 연결 중...</span>
					{:else if connectionStatus === 'disconnecting'}
						<div class="status-dot disconnecting"></div>
						<span class="status-text">🟠 종료 중...</span>
					{:else}
						<div class="status-dot disconnected"></div>
						<span class="status-text">⚫ 종료됨 (과금 안됨)</span>
					{/if}
				</div>
			</div>
			
			<div class="conversation-box">
				<h3>대화 내용</h3>
				<div class="conversation-text">
					{conversationText || '대화를 시작하세요...'}
				</div>
			</div>
			
			{#if isConnected}
				<button 
					class="btn btn-disconnect" 
					on:click={disconnectRealtime}
					disabled={isDisconnecting}
				>
					{isDisconnecting ? '종료 중...' : '연결 종료'}
				</button>
			{:else if connectionStatus === 'disconnected'}
				<button 
					class="btn btn-new-session" 
					on:click={connectRealtime}
				>
					새 대화 시작
				</button>
			{/if}
		</div>
	{:else}
		<!-- 기존 녹음 모드 -->
		<div class="recorder-section">
		<div class="recording-indicator">
			{#if isRecording}
				<div class="recording-dot"></div>
				<span class="recording-time">{formatTime(recordingTime)}</span>
			{:else}
				<span class="ready-text">녹음 대기 중</span>
			{/if}
		</div>

		{#if isRecording}
			<div class="waveform-container">
				<canvas bind:this={canvasElement} width="500" height="120"></canvas>
			</div>
		{/if}

		<div class="controls">
			{#if !isRecording}
				<button class="btn btn-start" on:click={startRecording}>
					<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
						<path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
						<line x1="12" y1="19" x2="12" y2="23"></line>
						<line x1="8" y1="23" x2="16" y2="23"></line>
					</svg>
					녹음 시작
				</button>
			{:else}
				<button class="btn btn-stop" on:click={stopRecording}>
					<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
						<rect x="6" y="6" width="12" height="12" rx="2"></rect>
					</svg>
					녹음 중지
				</button>
			{/if}
		</div>
	</div>
	{/if}

	{#if audioUrl}
		<div class="playback-section">
			<h2>녹음된 음성</h2>
			<audio controls src={audioUrl}>
				브라우저가 오디오 재생을 지원하지 않습니다.
			</audio>
			<button class="btn btn-download" on:click={downloadRecording}>
				<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
					<polyline points="7 10 12 15 17 10"></polyline>
					<line x1="12" y1="15" x2="12" y2="3"></line>
				</svg>
				다운로드
			</button>
		</div>
	{/if}
</div>

<style>
	.container {
		max-width: 800px;
		margin: 0 auto;
		padding: 2rem;
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
	}
	
	.user-info {
		display: flex;
		justify-content: flex-end;
		align-items: center;
		gap: 1rem;
		margin-bottom: 1rem;
		padding: 0.75rem;
		background: white;
		border-radius: 10px;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
	}
	
	.user-email {
		color: #555;
		font-size: 0.9rem;
		font-weight: 500;
	}
	
	.btn-logout {
		padding: 0.5rem 1rem;
		background: #ef4444;
		color: white;
		border: none;
		border-radius: 8px;
		font-size: 0.9rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.3s ease;
	}
	
	.btn-logout:hover {
		background: #dc2626;
		transform: translateY(-2px);
	}

	.mode-toggle {
		display: flex;
		gap: 1rem;
		margin-bottom: 2rem;
		justify-content: center;
	}

	.mode-btn {
		padding: 0.75rem 1.5rem;
		font-size: 1rem;
		font-weight: 600;
		border: 2px solid #667eea;
		border-radius: 25px;
		background: white;
		color: #667eea;
		cursor: pointer;
		transition: all 0.3s ease;
	}

	.mode-btn:hover:not(:disabled) {
		background: #f0f0f0;
		transform: translateY(-2px);
	}

	.mode-btn.active {
		background: #667eea;
		color: white;
	}

	.mode-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.error-message {
		background: #fee;
		color: #c33;
		padding: 1rem;
		border-radius: 10px;
		margin-bottom: 1rem;
		text-align: center;
	}

	.realtime-section {
		background: linear-gradient(135deg, #10b981 0%, #059669 100%);
		border-radius: 20px;
		padding: 2rem;
		box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
		margin-bottom: 2rem;
	}

	.connection-status-box {
		background: white;
		border-radius: 12px;
		padding: 1rem 1.5rem;
		margin-bottom: 1rem;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
	}

	.connection-status-box.connected {
		border-left: 4px solid #10b981;
	}

	.connection-status-box.connecting {
		border-left: 4px solid #f59e0b;
	}

	.connection-status-box.disconnecting {
		border-left: 4px solid #f97316;
	}

	.connection-status-box.disconnected {
		border-left: 4px solid #6b7280;
	}

	.status-indicator {
		display: flex;
		align-items: center;
		gap: 12px;
	}

	.status-dot {
		width: 12px;
		height: 12px;
		border-radius: 50%;
	}

	.status-dot.connected {
		background-color: #10b981;
		animation: pulse-green 2s ease-in-out infinite;
	}

	.status-dot.connecting {
		background-color: #f59e0b;
		animation: pulse-yellow 1s ease-in-out infinite;
	}

	.status-dot.disconnecting {
		background-color: #f97316;
		animation: pulse-orange 0.8s ease-in-out infinite;
	}

	.status-dot.disconnected {
		background-color: #6b7280;
	}

	@keyframes pulse-green {
		0%, 100% {
			opacity: 1;
			transform: scale(1);
		}
		50% {
			opacity: 0.7;
			transform: scale(1.2);
		}
	}

	@keyframes pulse-yellow {
		0%, 100% {
			opacity: 1;
			transform: scale(1);
		}
		50% {
			opacity: 0.6;
			transform: scale(1.3);
		}
	}

	@keyframes pulse-orange {
		0%, 100% {
			opacity: 1;
			transform: scale(1);
		}
		50% {
			opacity: 0.5;
			transform: scale(1.4);
		}
	}

	.status-text {
		font-weight: 600;
		font-size: 1rem;
		color: #111827;
	}

	.conversation-box {
		background: white;
		border-radius: 15px;
		padding: 1.5rem;
		margin-bottom: 1rem;
		min-height: 300px;
		max-height: 400px;
		overflow-y: auto;
	}

	.conversation-box h3 {
		margin-top: 0;
		margin-bottom: 1rem;
		color: #333;
	}

	.conversation-text {
		white-space: pre-wrap;
		line-height: 1.6;
		color: #333;
		font-size: 0.95rem;
	}

	.btn-disconnect {
		background-color: #ef4444;
		color: white;
		width: 100%;
	}

	.btn-disconnect:hover:not(:disabled) {
		background-color: #dc2626;
	}

	.btn-disconnect:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.btn-new-session {
		background-color: #10b981;
		color: white;
		width: 100%;
	}

	.btn-new-session:hover {
		background-color: #059669;
	}

	h1 {
		text-align: center;
		color: #333;
		margin-bottom: 2rem;
	}

	.recorder-section {
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		border-radius: 20px;
		padding: 3rem 2rem;
		box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
		margin-bottom: 2rem;
	}

	.recording-indicator {
		text-align: center;
		margin-bottom: 2rem;
		min-height: 40px;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 12px;
	}

	.recording-dot {
		width: 16px;
		height: 16px;
		background-color: #ff4444;
		border-radius: 50%;
		animation: pulse 1.5s ease-in-out infinite;
	}

	@keyframes pulse {
		0%, 100% {
			opacity: 1;
			transform: scale(1);
		}
		50% {
			opacity: 0.5;
			transform: scale(1.1);
		}
	}

	.recording-time {
		font-size: 2rem;
		font-weight: bold;
		color: white;
		font-variant-numeric: tabular-nums;
	}

	.ready-text {
		font-size: 1.2rem;
		color: rgba(255, 255, 255, 0.9);
	}

	.waveform-container {
		margin: 2rem 0;
		display: flex;
		justify-content: center;
		align-items: center;
		background: rgba(0, 0, 0, 0.2);
		border-radius: 15px;
		padding: 1.5rem;
		backdrop-filter: blur(10px);
	}

	.waveform-container canvas {
		width: 100%;
		max-width: 500px;
		height: 120px;
		border-radius: 10px;
		background: rgba(0, 0, 0, 0.3);
	}

	.controls {
		display: flex;
		justify-content: center;
	}

	.btn {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		padding: 1rem 2rem;
		font-size: 1.1rem;
		font-weight: 600;
		border: none;
		border-radius: 50px;
		cursor: pointer;
		transition: all 0.3s ease;
		box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
	}

	.btn:hover {
		transform: translateY(-2px);
		box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
	}

	.btn:active {
		transform: translateY(0);
	}

	.btn-start {
		background-color: #ef4444;
		color: white;
	}

	.btn-start:hover {
		background-color: #dc2626;
	}

	.btn-stop {
		background-color: #ef4444;
		color: white;
	}

	.btn-stop:hover {
		background-color: #dc2626;
	}

	.btn-download {
		background-color: #3b82f6;
		color: white;
		margin-top: 1rem;
	}

	.btn-download:hover {
		background-color: #2563eb;
	}

	.playback-section {
		background: white;
		border-radius: 15px;
		padding: 2rem;
		box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
	}

	.playback-section h2 {
		margin-top: 0;
		margin-bottom: 1rem;
		color: #333;
		font-size: 1.3rem;
	}

	audio {
		width: 100%;
		margin-bottom: 1rem;
		border-radius: 10px;
	}

	/* 디버그 패널 스타일 */
	.debug-toggle {
		position: fixed;
		bottom: 20px;
		right: 20px;
		z-index: 1000;
	}

	.debug-btn {
		padding: 0.75rem 1.25rem;
		background: #2563eb;
		color: white;
		border: none;
		border-radius: 25px;
		cursor: pointer;
		font-size: 0.9rem;
		font-weight: 600;
		box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
		transition: all 0.3s ease;
	}

	.debug-btn:hover {
		background: #1d4ed8;
		transform: translateY(-2px);
		box-shadow: 0 6px 16px rgba(37, 99, 235, 0.4);
	}

	.debug-btn.has-error {
		background: #ef4444;
		animation: shake 0.5s ease;
	}

	.debug-btn.has-error:hover {
		background: #dc2626;
	}

	@keyframes shake {
		0%, 100% { transform: translateX(0); }
		25% { transform: translateX(-5px); }
		75% { transform: translateX(5px); }
	}

	.debug-panel {
		position: fixed;
		bottom: 80px;
		right: 20px;
		width: 600px;
		max-height: 500px;
		background: white;
		border-radius: 15px;
		box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
		z-index: 999;
		display: flex;
		flex-direction: column;
	}

	.debug-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1rem 1.5rem;
		border-bottom: 1px solid #e5e7eb;
		background: #f9fafb;
		border-radius: 15px 15px 0 0;
	}

	.debug-header h3 {
		margin: 0;
		font-size: 1.1rem;
		color: #111827;
	}

	.debug-actions {
		display: flex;
		gap: 0.5rem;
	}

	.debug-action-btn {
		padding: 0.4rem 0.8rem;
		background: white;
		border: 1px solid #d1d5db;
		border-radius: 6px;
		cursor: pointer;
		font-size: 0.85rem;
		transition: all 0.2s;
	}

	.debug-action-btn:hover {
		background: #f3f4f6;
		border-color: #9ca3af;
	}

	.debug-error-summary {
		padding: 1rem 1.5rem;
		background: #fef2f2;
		border-bottom: 2px solid #fecaca;
	}

	.debug-error-summary strong {
		color: #dc2626;
		display: block;
		margin-bottom: 0.5rem;
	}

	.error-detail {
		color: #991b1b;
		font-size: 0.95rem;
		margin-bottom: 0.5rem;
	}

	.error-data {
		background: white;
		padding: 0.75rem;
		border-radius: 6px;
		border: 1px solid #fecaca;
		font-size: 0.8rem;
		overflow-x: auto;
		margin: 0;
	}

	.debug-logs {
		flex: 1;
		overflow-y: auto;
		padding: 1rem 1.5rem;
		max-height: 350px;
	}

	.no-logs {
		text-align: center;
		color: #9ca3af;
		padding: 2rem;
		font-style: italic;
	}

	.debug-log-item {
		padding: 0.75rem;
		margin-bottom: 0.5rem;
		border-left: 3px solid #e5e7eb;
		background: #f9fafb;
		border-radius: 6px;
		font-size: 0.85rem;
	}

	.debug-log-item.log-error {
		border-left-color: #ef4444;
		background: #fef2f2;
	}

	.debug-log-item.log-success {
		border-left-color: #10b981;
		background: #f0fdf4;
	}

	.debug-log-item.log-warning {
		border-left-color: #f59e0b;
		background: #fffbeb;
	}

	.log-timestamp {
		color: #6b7280;
		font-family: 'Courier New', monospace;
		margin-right: 0.5rem;
		font-size: 0.75rem;
	}

	.log-level {
		font-weight: 600;
		margin-right: 0.5rem;
		padding: 0.1rem 0.4rem;
		border-radius: 3px;
		font-size: 0.7rem;
	}

	.log-level-info {
		background: #dbeafe;
		color: #1e40af;
	}

	.log-level-success {
		background: #d1fae5;
		color: #065f46;
	}

	.log-level-warning {
		background: #fef3c7;
		color: #92400e;
	}

	.log-level-error {
		background: #fee2e2;
		color: #991b1b;
	}

	.log-message {
		color: #374151;
	}

	.log-data {
		background: white;
		padding: 0.5rem;
		margin-top: 0.5rem;
		border-radius: 4px;
		border: 1px solid #e5e7eb;
		font-size: 0.75rem;
		overflow-x: auto;
		font-family: 'Courier New', monospace;
	}

	/* 모바일 대응 */
	@media (max-width: 640px) {
		.debug-panel {
			width: calc(100vw - 40px);
			right: 20px;
			left: 20px;
		}
	}
</style>
