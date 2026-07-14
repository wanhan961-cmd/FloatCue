import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Eye, 
  Mic, 
  Sliders, 
  HelpCircle, 
  Sparkles, 
  Tv, 
  Play, 
  Volume2, 
  Minimize2, 
  Maximize2,
  BookOpen, 
  Video, 
  Settings,
  Flame,
  Info,
  ShieldCheck,
  Smartphone
} from 'lucide-react';
import { FloatCueConfig, PrompterLine } from './types';
import { DEFAULT_SCRIPT_LINES } from './presets';
import MainConsole from './components/MainConsole';
import PhoneSimulator from './components/PhoneSimulator';

export default function App() {
  // Global config for FloatCue
  const [config, setConfig] = useState<FloatCueConfig>({
    contentMode: 'text',
    text: DEFAULT_SCRIPT_LINES.map(l => l.text).join('\n'),
    lines: DEFAULT_SCRIPT_LINES,
    mediaUrl: null,
    mediaType: null,
    voiceScrolling: true,
    opacity: 85,
    scale: 1.0,
    scrollSpeed: 50,
    fontSize: 18,
    autoScroll: false,
    autoScrollSpeed: 6.0,
  });

  // State management
  const [activeLineId, setActiveLineId] = useState<string>('1');
  const [isOverlayActive, setIsOverlayActive] = useState<boolean>(false);
  const [isMobile, setIsMobile] = useState<boolean>(false);

  // System-level Picture-in-Picture States and Refs
  const [isPipActive, setIsPipActive] = useState<boolean>(false);
  const pipCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const pipVideoRef = useRef<HTMLVideoElement | null>(null);
  const pipScrollYRef = useRef<number>(0);
  const requestAnimationFrameRef = useRef<number | null>(null);
  const imgCacheRef = useRef<{ [url: string]: HTMLImageElement }>({});

  // Detect mobile viewports dynamically
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Text Wrapping Helper for Canvas
  const wrapText = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] => {
    const words = text.split('');
    const lines: string[] = [];
    let currentLine = '';
    
    for (let n = 0; n < words.length; n++) {
      const testLine = currentLine + words[n];
      const metrics = ctx.measureText(testLine);
      const testWidth = metrics.width;
      if (testWidth > maxWidth && n > 0) {
        lines.push(currentLine);
        currentLine = words[n];
      } else {
        currentLine = testLine;
      }
    }
    lines.push(currentLine);
    return lines;
  };

  // Canvas Teleprompter Animation Loop
  const animatePipCanvas = () => {
    if (!pipCanvasRef.current) return;
    const canvas = pipCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear background
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, width, height);

    if (config.contentMode === 'text') {
      // Glow boundary
      ctx.strokeStyle = '#10B981';
      ctx.lineWidth = 4;
      ctx.strokeRect(2, 2, width - 4, height - 4);

      // Header info
      ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'left';
      ctx.fillText('FLOATCUE LIVE SYSTEM ∙ AUTOSCROLL', 20, 25);

      // REC status
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(width - 30, 22, 5, 0, Math.PI * 2);
      ctx.fill();

      const lines = linesRef.current;
      const activeIndex = lines.findIndex(l => l.id === activeLineIdRef.current);
      const targetScrollY = activeIndex !== -1 ? activeIndex : 0;

      // Smooth scrolling LERP
      pipScrollYRef.current += (targetScrollY - pipScrollYRef.current) * 0.12;

      const centerY = height / 2;
      const lineSpacing = 70;

      lines.forEach((line, index) => {
        const relativeIndex = index - pipScrollYRef.current;
        const y = centerY + relativeIndex * lineSpacing;

        // Skip drawing if offscreen
        if (y < -60 || y > height + 60) return;

        const isActive = index === activeIndex;

        ctx.textAlign = 'center';
        if (isActive) {
          ctx.fillStyle = '#10B981';
          ctx.font = 'bold 26px sans-serif';
          
          // Draw focal brackets around active line
          ctx.strokeStyle = 'rgba(16, 185, 129, 0.4)';
          ctx.lineWidth = 2;
          
          ctx.beginPath();
          ctx.moveTo(40, y - 22);
          ctx.lineTo(20, y - 22);
          ctx.lineTo(20, y + 10);
          ctx.lineTo(40, y + 10);
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(width - 40, y - 22);
          ctx.lineTo(width - 20, y - 22);
          ctx.lineTo(width - 20, y + 10);
          ctx.lineTo(width - 40, y + 10);
          ctx.stroke();
        } else {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
          ctx.font = '20px sans-serif';
        }

        const wrappedLines = wrapText(ctx, line.text, width - 120);
        wrappedLines.forEach((wrappedText, subIndex) => {
          const subY = y + (subIndex - (wrappedLines.length - 1) / 2) * 28;
          ctx.fillText(wrappedText, width / 2, subY);
        });
      });
    } else if (config.contentMode === 'image' && config.mediaUrl) {
      const img = imgCacheRef.current[config.mediaUrl];
      if (img && img.complete) {
        const imgRatio = img.width / img.height;
        const canvasRatio = width / height;
        let drawWidth = width;
        let drawHeight = height;
        let offsetX = 0;
        let offsetY = 0;

        if (imgRatio > canvasRatio) {
          drawHeight = width / imgRatio;
          offsetY = (height - drawHeight) / 2;
        } else {
          drawWidth = height * imgRatio;
          offsetX = (width - drawWidth) / 2;
        }

        ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
      } else {
        ctx.fillStyle = '#111111';
        ctx.fillRect(0, 0, width, height);
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '20px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('正在加载参考图像...', width / 2, height / 2);

        if (!imgCacheRef.current[config.mediaUrl]) {
          const newImg = new Image();
          newImg.crossOrigin = "anonymous";
          newImg.src = config.mediaUrl;
          newImg.onload = () => {
            imgCacheRef.current[config.mediaUrl!] = newImg;
          };
        }
      }
    } else if (config.contentMode === 'video' && config.mediaUrl) {
      const srcVideo = document.getElementById('floating-cue-widget-video') as HTMLVideoElement;
      if (srcVideo) {
        ctx.drawImage(srcVideo, 0, 0, width, height);
      } else {
        ctx.fillStyle = '#111111';
        ctx.fillRect(0, 0, width, height);
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '18px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('参考视频就绪 (请在主界面播放视频)', width / 2, height / 2);
      }
    }

    requestAnimationFrameRef.current = requestAnimationFrame(animatePipCanvas);
  };

  // Run the canvas rendering engine on layout changes
  useEffect(() => {
    requestAnimationFrameRef.current = requestAnimationFrame(animatePipCanvas);
    return () => {
      if (requestAnimationFrameRef.current) {
        cancelAnimationFrame(requestAnimationFrameRef.current);
      }
    };
  }, [config, activeLineId]);

  // Request system Picture-in-Picture (PiP)
  const handleTogglePiP = async () => {
    const video = pipVideoRef.current;
    const canvas = pipCanvasRef.current;
    if (!video || !canvas) {
      triggerToast("⚠️ 正在准备悬浮环境，请稍后重试...");
      return;
    }

    if (isPipActive) {
      try {
        if (document.exitPictureInPicture) {
          await document.exitPictureInPicture();
        } else if ((video as any).webkitSetPresentationMode) {
          await (video as any).webkitSetPresentationMode("inline");
        }
        setIsPipActive(false);
      } catch (err) {
        console.error("Failed to exit Picture-in-Picture:", err);
      }
    } else {
      try {
        let stream: MediaStream;
        if ((canvas as any).captureStream) {
          stream = (canvas as any).captureStream(24);
        } else if ((canvas as any).mozCaptureStream) {
          stream = (canvas as any).mozCaptureStream(24);
        } else {
          throw new Error("captureStream is not supported on this browser");
        }

        video.srcObject = stream;
        await video.play();

        if (video.requestPictureInPicture) {
          await video.requestPictureInPicture();
        } else if ((video as any).webkitSetPresentationMode) {
          await (video as any).webkitSetPresentationMode("picture-in-picture");
        } else {
          throw new Error("Picture-in-Picture API is not supported in this browser");
        }

        setIsPipActive(true);
        triggerToast("🎉 跨软件系统悬浮提词（画中画）已开启！现在您可以切出微信、桌面对齐相机拍摄啦！");
      } catch (err: any) {
        console.error("Failed to enter Picture-in-Picture:", err);
        triggerToast("⚠️ 开启画中画失败。请确保在 Safari/Chrome 浏览器中打开，且该浏览器支持视频画中画协议。");
      }
    }
  };

  // Listen to browser Picture-in-Picture close actions
  useEffect(() => {
    const video = pipVideoRef.current;
    if (!video) return;

    const handleLeave = () => {
      setIsPipActive(false);
      triggerToast("浮窗画中画已收回。");
    };

    video.addEventListener('leavepictureinpicture', handleLeave);
    video.addEventListener('webkitpresentationmodechanged', () => {
      if ((video as any).webkitPresentationMode === 'inline') {
        setIsPipActive(false);
        triggerToast("浮窗画中画已收回。");
      }
    });

    return () => {
      video.removeEventListener('leavepictureinpicture', handleLeave);
    };
  }, []);

  // States for Countdown & Continuous Auto Scroll Playback
  const [isAutoScrollPlaying, setIsAutoScrollPlaying] = useState<boolean>(false);
  const [autoScrollCountdown, setAutoScrollCountdown] = useState<number | null>(null);

  // Keep references to config.lines and activeLineId to avoid restarting the timer when they change
  const linesRef = useRef(config.lines);
  const activeLineIdRef = useRef(activeLineId);
  const autoScrollStartedRef = useRef<boolean>(false);

  // Reset the starting ref when autoScroll is turned off or overlay is deactivated
  useEffect(() => {
    if (!config.autoScroll || !isOverlayActive) {
      autoScrollStartedRef.current = false;
      setIsAutoScrollPlaying(false);
      setAutoScrollCountdown(null);
    }
  }, [config.autoScroll, isOverlayActive]);

  useEffect(() => {
    linesRef.current = config.lines;
  }, [config.lines]);

  useEffect(() => {
    activeLineIdRef.current = activeLineId;
  }, [activeLineId]);
  
  // Real voice microphone state
  const [micActive, setMicActive] = useState<boolean>(false);
  const [speechTranscript, setSpeechTranscript] = useState<string>('');
  
  // Real-time voice synchronization continuous character index
  const currentGRef = useRef<number>(0);
  
  // Track speech progress for the first sentence in auto-scroll mode
  const lastMatchProgressRef = useRef<number>(0);
  const lastMatchTimeRef = useRef<number>(0);

  // Helper to flatten and clean the prompter script lines
  const buildFlatScript = (lines: PrompterLine[]) => {
    const flat: { char: string; lineId: string; lineIndex: number; charProgress: number }[] = [];
    const cleanReg = /[.,\/#!$%\^&\*;:{}=\-_`~()！？，。、；：“”‘’\s]/g;
    
    lines.forEach((line, lineIdx) => {
      const cleanedText = line.text.replace(cleanReg, "").toLowerCase();
      const len = cleanedText.length;
      for (let i = 0; i < len; i++) {
        flat.push({
          char: cleanedText[i],
          lineId: line.id,
          lineIndex: lineIdx,
          charProgress: len > 1 ? i / (len - 1) : 0.0
        });
      }
    });
    return flat;
  };

  // Synchronize manual activeLineId changes to the current character pointer (currentGRef)
  useEffect(() => {
    const flatScript = buildFlatScript(config.lines);
    const firstIdx = flatScript.findIndex(c => c.lineId === activeLineId);
    if (firstIdx !== -1) {
      currentGRef.current = firstIdx;
    }
  }, [activeLineId, config.lines]);

  // Silence / pause detection to handle end-of-speech fallback for the first line
  useEffect(() => {
    if (!micActive || !config.autoScroll || activeLineId !== (config.lines[0]?.id || '1')) {
      return;
    }

    const interval = setInterval(() => {
      const now = Date.now();
      const lastTime = lastMatchTimeRef.current;
      const progress = lastMatchProgressRef.current;

      // If they matched at least 35% of the first sentence, and have been silent for more than 1.2 seconds,
      // we assume they have finished reading the first sentence and transition automatically!
      if (lastTime > 0 && now - lastTime > 1200 && progress >= 0.35) {
        // Reset track refs
        lastMatchTimeRef.current = 0;
        lastMatchProgressRef.current = 0;
        
        setMicActive(false);
        if (config.lines.length > 1) {
          setActiveLineId(config.lines[1].id);
        }
        setIsAutoScrollPlaying(true);
        triggerToast("🎉 第一句读完（检测到停顿），已自动为您开启匀速滚动！");
      }
    }, 200);

    return () => clearInterval(interval);
  }, [micActive, config.autoScroll, activeLineId, config.lines]);
  
  // Simulated Vocal Player state
  const [isSimulatingVoice, setIsSimulatingVoice] = useState<boolean>(false);
  const speechUtterancesRef = useRef<SpeechSynthesisUtterance[]>([]);
  const currentUtteranceIndexRef = useRef<number>(0);

  // Toast / System HUD states
  const [showToastHint, setShowToastHint] = useState<boolean>(false);
  const [toastText, setToastText] = useState<string>('');

  // Floating settings drawer / view modifier
  const [isPhoneFocusMode, setIsPhoneFocusMode] = useState<boolean>(false);

  // Helper: Trigger elegant HUD notification
  const triggerToast = (text: string) => {
    setToastText(text);
    setShowToastHint(true);
    const timer = setTimeout(() => {
      setShowToastHint(false);
    }, 2800);
    return () => clearTimeout(timer);
  };

  // Launch FloatCue Float Mode action
  const handleActivate = async () => {
    setIsOverlayActive(true);
    if (!isPipActive) {
      await handleTogglePiP();
    } else {
      triggerToast("请开始录制，FloatCue 提词器与画中画参考已就位。");
    }
  };

  // Double click or close callback
  const handleDeactivate = async () => {
    setIsOverlayActive(false);
    setMicActive(false);
    handleStopVoiceSimulation();
    if (isPipActive) {
      await handleTogglePiP(); // exits PiP
    } else {
      triggerToast("浮窗已成功收回控制台。");
    }
  };

  // Enforce state constraints (like mutual exclusivity) in a single unified config handler
  const handleConfigChange = (newConfig: FloatCueConfig) => {
    setConfig(prev => {
      const voiceScrollingChanged = prev.voiceScrolling !== newConfig.voiceScrolling;
      const autoScrollChanged = prev.autoScroll !== newConfig.autoScroll;
      
      let nextConfig = { ...newConfig };
      
      if (voiceScrollingChanged && newConfig.voiceScrolling) {
        // Voice scrolling enabled -> disable autoScroll
        nextConfig.autoScroll = false;
      } else if (autoScrollChanged && newConfig.autoScroll) {
        // Auto scroll enabled -> disable voiceScrolling, stop mic and speech simulation
        nextConfig.voiceScrolling = false;
        setMicActive(false);
        handleStopVoiceSimulation();
      }
      
      return nextConfig;
    });
  };

  // Handlers for scaling and opacity changes from children
  const handleScaleChange = (newScale: number) => {
    setConfig(prev => ({ ...prev, scale: newScale }));
  };

  const handleOpacityChange = (newOpacity: number) => {
    setConfig(prev => ({ ...prev, opacity: newOpacity }));
  };

  const handleFontSizeChange = (newFontSize: number) => {
    setConfig(prev => ({ ...prev, fontSize: newFontSize }));
  };

  const handleAutoScrollToggle = (enabled: boolean) => {
    handleConfigChange({
      ...config,
      autoScroll: enabled
    });
  };

  const handleAutoScrollSpeedChange = (speed: number) => {
    handleConfigChange({
      ...config,
      autoScrollSpeed: speed
    });
  };

  // Countdown Timer Handler
  useEffect(() => {
    if (autoScrollCountdown === null) return;

    if (autoScrollCountdown === 0) {
      setAutoScrollCountdown(null);
      setIsAutoScrollPlaying(true);
      triggerToast("🎉 倒计时结束，已开启匀速自动滚动！");
      return;
    }

    const timer = setTimeout(() => {
      setAutoScrollCountdown(prev => (prev !== null ? prev - 1 : null));
    }, 1000);

    return () => clearTimeout(timer);
  }, [autoScrollCountdown]);

  const handleStartAutoScroll = () => {
    if (isAutoScrollPlaying || autoScrollCountdown !== null) return;
    lastMatchTimeRef.current = 0;
    lastMatchProgressRef.current = 0;
    setAutoScrollCountdown(3);
    triggerToast("⏱️ 准备开始，倒计时 3 秒...");
  };

  const handlePauseAutoScroll = () => {
    setIsAutoScrollPlaying(false);
    setAutoScrollCountdown(null);
    triggerToast("⏸️ 已暂停自动滚动。");
  };

  const handleResetAutoScroll = () => {
    setIsAutoScrollPlaying(false);
    setAutoScrollCountdown(null);
    lastMatchTimeRef.current = 0;
    lastMatchProgressRef.current = 0;
    if (config.lines.length > 0) {
      setActiveLineId(config.lines[0].id);
    }
    triggerToast("🔄 已重置滚动位置。");
  };

  // AI REAL VOICE INPUT RECOGNITION (Web Speech API)
  useEffect(() => {
    let recognition: any = null;
    let isComponentMounted = true;
    
    if (micActive && (config.voiceScrolling || config.autoScroll) && config.contentMode === 'text') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      
      if (SpeechRecognition) {
        try {
          recognition = new SpeechRecognition();
          recognition.continuous = true;
          recognition.interimResults = true;
          recognition.lang = 'zh-CN'; // Set default language to Chinese for high matching rate

          recognition.onresult = (event: any) => {
            if (!isComponentMounted) return;
            let accumulatedTranscript = '';
            let currentPhrase = '';

            for (let i = 0; i < event.results.length; ++i) {
              const text = event.results[i][0].transcript;
              accumulatedTranscript += text;
              if (i === event.results.length - 1) {
                currentPhrase = text;
              }
            }

            const cleanTranscript = accumulatedTranscript.toLowerCase();
            const cleanPhrase = currentPhrase.toLowerCase();
            
            // Display what is heard in real-time
            setSpeechTranscript(cleanPhrase || cleanTranscript);

            // Match words and scroll the prompter
            if (cleanPhrase.trim().length > 0) {
              matchScriptLine(cleanPhrase, cleanTranscript);
            } else if (cleanTranscript.trim().length > 0) {
              matchScriptLine(cleanTranscript, cleanTranscript);
            }
          };

          recognition.onerror = (event: any) => {
            if (!isComponentMounted) return;
            
            // Handle expected errors gracefully
            if (event.error === 'no-speech') {
              console.log('Speech recognition: quiet / no speech detected, continuing listening.');
              return;
            }
            if (event.error === 'aborted') {
              console.log('Speech recognition: aborted.');
              return;
            }

            console.error('Speech recognition error:', event.error);
            if (event.error === 'not-allowed') {
              setMicActive(false);
              triggerToast('未获得麦克风授权，请先在浏览器中允许录音。');
            }
          };

          recognition.onend = () => {
            if (!isComponentMounted) return;
            
            // Keep recognition active unless mic is intentionally disabled, with a brief cooldown to avoid browser overlap errors
            if (micActive) {
              setTimeout(() => {
                if (isComponentMounted && micActive) {
                  try {
                    recognition.start();
                  } catch (e) {
                    // Ignore start crashes if already running
                  }
                }
              }, 400);
            }
          };

          recognition.start();
          triggerToast('端侧语音实时滚动已就绪 🎤');
        } catch (err) {
          console.error('Speech recognition init error', err);
        }
      } else {
        setMicActive(false);
        triggerToast('当前浏览器不支持端侧 WebSpeech，推荐使用人声模拟朗读。');
      }
    }

    return () => {
      isComponentMounted = false;
      if (recognition) {
        recognition.onend = null;
        recognition.onerror = null;
        recognition.onresult = null;
        try {
          recognition.stop();
        } catch (e) {}
      }
    };
  }, [micActive, config.voiceScrolling, config.autoScroll, config.contentMode]);

  // Fuzzy matching algorithm to align speech transcript to the correct script line
  const matchScriptLine = (phrase: string, fullTranscript: string) => {
    if (!phrase) return;

    const clean = (str: string) => str.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()！？，。、；：“”‘’\s]/g, "").toLowerCase();
    
    const cleanedFull = clean(fullTranscript);
    if (!cleanedFull) return;

    // Build the character-level flattened representation of the entire script
    const flatScript = buildFlatScript(config.lines);
    if (flatScript.length === 0) return;

    // Use a relevant sliding window of the last 15 spoken characters for localized matching
    const recentSpoken = cleanedFull.slice(-15);

    // Get current global character pointer
    const currentG = currentGRef.current;

    // Constrain search window to [currentG - 15, currentG + 30] to allow minor rewinds but prevent wild jumps due to noise
    const minG = Math.max(0, currentG - 15);
    const maxG = Math.min(flatScript.length - 1, currentG + 30);

    // Right-to-left fuzzy subsequence alignment matcher to favor recent spoken phonemes
    const matchRightToLeft = (s1: string, s2: string): number => {
      let i = s1.length - 1;
      let j = s2.length - 1;
      let score = 0;
      
      while (i >= 0 && j >= 0) {
        if (s1[i] === s2[j]) {
          // Weighted scoring: give higher weight to most recently spoken characters (closer to the end of s2)
          const distanceToEnd = s2.length - 1 - j;
          const weight = Math.max(0.1, 1.0 - distanceToEnd * 0.08);
          score += weight;
          i--;
          j--;
        } else {
          // Simple local alignment skipping
          if (i > 0 && s1[i - 1] === s2[j]) {
            i--;
          } else if (j > 0 && s1[i] === s2[j - 1]) {
            j--;
          } else {
            i--;
            j--;
          }
        }
      }
      return score;
    };

    let bestG = currentG;
    let maxScore = -1;

    // Scan every index in the search window to find the most likely current speaking position
    for (let g = minG; g <= maxG; g++) {
      // Extract script slice ending at index 'g'
      const sliceStart = Math.max(0, g - 14);
      const scriptSlice = flatScript.slice(sliceStart, g + 1).map(x => x.char).join("");
      
      const score = matchRightToLeft(scriptSlice, recentSpoken);
      if (score > maxScore) {
        maxScore = score;
        bestG = g;
      }
    }

    // Update global tracking state if the match strength is reliable (threshold score 1.5)
    if (maxScore >= 1.5) {
      currentGRef.current = bestG;
      const matchedChar = flatScript[bestG];
      
      let targetLineId = matchedChar.lineId;
      let targetProgress = matchedChar.charProgress;
      
      const lines = config.lines;
      const currentLineIdx = lines.findIndex(l => l.id === matchedChar.lineId);
      
      if (currentLineIdx !== -1 && currentLineIdx < lines.length - 1) {
        // If we have read 70% or more of the current line, pre-highlight/activate the next line!
        if (matchedChar.charProgress >= 0.70) {
          targetLineId = lines[currentLineIdx + 1].id;
          targetProgress = 0.0;
        }
      }

      // Update state to trigger smooth rendering in FloatingCueWidget
      if (targetLineId !== activeLineId) {
        setActiveLineId(targetLineId);
      }
      setConfig(prev => ({ ...prev, vocalProgress: targetProgress }));
    }
  };

  // HANDLES AUTOMATIC AUDIO SPEECH SIMULATION (TTS Engine)
  const handleStartVoiceSimulation = () => {
    if (config.contentMode !== 'text') return;
    
    // Reset simulation
    window.speechSynthesis.cancel();
    setIsSimulatingVoice(true);
    setSpeechTranscript('');

    const linesToSpeak = config.lines;
    const utterances: SpeechSynthesisUtterance[] = [];

    linesToSpeak.forEach((line, index) => {
      const utterance = new SpeechSynthesisUtterance(line.text);
      
      // Try to find a high-quality Chinese or native voice
      const voices = window.speechSynthesis.getVoices();
      const cnVoice = voices.find(v => v.lang.includes('zh') || v.lang.includes('CN'));
      if (cnVoice) {
        utterance.voice = cnVoice;
      }
      
      utterance.rate = 1.0; // Perfect, natural speaking rate

      utterance.onstart = () => {
        if (config.autoScroll && index === 0) {
          handleStopVoiceSimulation();
          setIsAutoScrollPlaying(true);
          triggerToast("🎉 模拟人声已开始说话，已开启匀速自动滚动！");
          return;
        }
        // Fallback baseline scroll
        setActiveLineId(line.id);
        setConfig(prev => ({ ...prev, vocalProgress: 0.0 }));
        currentUtteranceIndexRef.current = index;
      };

      // Highly responsive word/char boundary listener to achieve extremely proactive scrolling before the line is finished
      utterance.onboundary = (event) => {
        if (event.name === 'word' || event.name === 'sentence') {
          const charIndex = event.charIndex;
          const textLength = line.text.length;
          
          const progress = textLength > 0 ? charIndex / textLength : 0.0;

          // Check if the speaking index has read 70% or more, or is within 3 characters of the end
          if (charIndex >= textLength - 3 || (textLength > 0 && charIndex >= textLength * 0.70)) {
            if (index < linesToSpeak.length - 1) {
              const nextLine = linesToSpeak[index + 1];
              setActiveLineId(nextLine.id);
              setConfig(prev => ({ ...prev, vocalProgress: 0.0 }));
            } else {
              setConfig(prev => ({ ...prev, vocalProgress: Math.min(0.95, progress) }));
            }
          } else {
            setConfig(prev => ({ ...prev, vocalProgress: Math.min(0.95, progress) }));
          }
        }
      };

      utterance.onend = () => {
        if (index === linesToSpeak.length - 1) {
          setIsSimulatingVoice(false);
          triggerToast('提词朗读完毕，已自动重置。');
          setActiveLineId('1');
          setConfig(prev => ({ ...prev, vocalProgress: 0.0 }));
        }
      };

      utterance.onerror = (err) => {
        // Ignore standard canceled or interrupted events as they are part of normal control flow
        if (err.error !== 'interrupted' && err.error !== 'canceled') {
          console.warn("TTS warning:", err.error || err);
        }
      };

      utterances.push(utterance);
    });

    speechUtterancesRef.current = utterances;
    
    // Play the sequence
    utterances.forEach(u => window.speechSynthesis.speak(u));
    triggerToast('开始端侧人声朗读，FloatCue 自动跟随语调。');
  };

  const handleStopVoiceSimulation = () => {
    window.speechSynthesis.cancel();
    setIsSimulatingVoice(false);
  };

  // Handle system voices dynamic load (some browsers defer load)
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.getVoices();
    }
    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#050505] font-sans antialiased text-gray-100">
      {/* Toast Alert HUD Layer (renders at top center of browser) */}
      <AnimatePresence>
        {showToastHint && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none"
          >
            <div className="bg-black/90 text-xs text-white border border-white/10 px-5 py-3 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] flex items-center gap-3 backdrop-blur-xl max-w-sm text-center font-sans tracking-wide">
              <Sparkles size={14} className="text-emerald-400 animate-pulse shrink-0" />
              <span>{toastText}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main split-screen Container */}
      <div className="flex w-full h-full relative">
        
        {/* Left Side: Setup Control Panel */}
        <div 
          className={`h-full transition-all duration-500 ease-in-out border-r border-white/10 shrink-0 ${
            (isMobile && isOverlayActive) || isPhoneFocusMode
              ? 'w-0 opacity-0 pointer-events-none overflow-hidden' 
              : 'w-full lg:w-[480px]'
          }`}
        >
          <MainConsole
            config={config}
            onChange={handleConfigChange}
            onActivate={handleActivate}
            isOverlayActive={isOverlayActive}
            micActive={micActive}
            setMicActive={setMicActive}
            isSimulatingVoice={isSimulatingVoice}
            onStartVoiceSimulation={handleStartVoiceSimulation}
            onStopVoiceSimulation={handleStopVoiceSimulation}
            speechTranscript={speechTranscript}
            isAutoScrollPlaying={isAutoScrollPlaying}
            autoScrollCountdown={autoScrollCountdown}
            onStartAutoScroll={handleStartAutoScroll}
            onPauseAutoScroll={handlePauseAutoScroll}
            onResetAutoScroll={handleResetAutoScroll}
            onTogglePiP={handleTogglePiP}
            isPipActive={isPipActive}
          />
        </div>

        {/* Right Side: Smartphone filming Stage & Interactive Simulator */}
        <div 
          className={`flex-1 h-full bg-[#0A0A0A] flex flex-col relative items-center justify-center ${
            isMobile && !isOverlayActive ? 'hidden lg:flex' : ''
          }`}
        >
          
          {/* Top Stage Control toolbar */}
          {(!isMobile || !isOverlayActive) && (
            <div className="absolute top-6 inset-x-6 flex items-center justify-between z-30 pointer-events-none">
              <div className="flex items-center gap-2 pointer-events-auto bg-black/40 backdrop-blur-md border border-white/5 px-3 py-1.5 rounded-full">
                <Smartphone size={12} className="text-white/60" />
                <span className="text-[10px] font-mono tracking-wide text-white/50">
                  {isPhoneFocusMode ? 'STUDIO CONSOLE MINIMIZED' : 'LIVE RECORDING STAGE'}
                </span>
              </div>

              {/* Minimize / Maximize Sidebar Control */}
              <button
                onClick={() => setIsPhoneFocusMode(!isPhoneFocusMode)}
                className="pointer-events-auto bg-[#121314] hover:bg-neutral-800 text-white/60 hover:text-white border border-white/10 p-2 rounded-full transition-all flex items-center justify-center shadow-lg"
                title={isPhoneFocusMode ? "展现控制面板" : "最大化手机拍摄模拟器"}
              >
                {isPhoneFocusMode ? <Maximize2 size={14} /> : <Minimize2 size={14} />}
              </button>
            </div>
          )}

          {/* Render the Interactive smartphone sandbox */}
          <div className="w-full h-full flex items-center justify-center p-0 lg:p-4">
            <PhoneSimulator
              config={config}
              activeLineId={activeLineId}
              onActiveLineChange={setActiveLineId}
              isOverlayActive={isOverlayActive}
              onDeactivate={handleDeactivate}
              onScaleChange={handleScaleChange}
              onOpacityChange={handleOpacityChange}
              onFontSizeChange={handleFontSizeChange}
              onAutoScrollToggle={handleAutoScrollToggle}
              onAutoScrollSpeedChange={handleAutoScrollSpeedChange}
              speechTranscript={speechTranscript}
              isSimulatingVoice={isSimulatingVoice}
              isAutoScrollPlaying={isAutoScrollPlaying}
              autoScrollCountdown={autoScrollCountdown}
              onStartAutoScroll={handleStartAutoScroll}
              onPauseAutoScroll={handlePauseAutoScroll}
              onResetAutoScroll={handleResetAutoScroll}
              micActive={micActive}
              isMobile={isMobile}
            />
          </div>

          {/* Quick instructions floating banner */}
          {(!isMobile || !isOverlayActive) && (
            <div className="absolute bottom-6 inset-x-6 text-center text-[10px] text-white/20 font-light tracking-wide pointer-events-none">
              FloatCue Studio Model ∙ 极简主义设计致敬 Apple ∙ Made by AI Studio Build
            </div>
          )}
        </div>

      </div>

      {/* Hidden canvas & video layers for Picture-in-Picture generation */}
      <canvas
        ref={pipCanvasRef}
        width={800}
        height={450}
        style={{
          position: 'absolute',
          top: '-9999px',
          left: '-9999px',
          opacity: 0,
          pointerEvents: 'none',
          width: '10px',
          height: '10px'
        }}
      />
      <video
        ref={pipVideoRef}
        playsInline
        muted
        style={{
          position: 'absolute',
          top: '-9999px',
          left: '-9999px',
          opacity: 0,
          pointerEvents: 'none',
          width: '10px',
          height: '10px'
        }}
      />
    </div>
  );
}
