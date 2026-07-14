import React, { useState, useRef, useEffect } from 'react';
import { 
  Type, 
  Image as ImageIcon, 
  Video as VideoIcon, 
  Sparkles, 
  HelpCircle, 
  Play, 
  Square, 
  Trash2, 
  Plus, 
  Mic, 
  Volume2, 
  Check, 
  Eye, 
  SlidersHorizontal,
  ShieldCheck,
  AlertTriangle
} from 'lucide-react';
import { FloatCueConfig, PrompterLine } from '../types';
import { DEFAULT_SCRIPT_LINES, PRESET_IMAGES, PRESET_VIDEOS } from '../presets';

interface MainConsoleProps {
  config: FloatCueConfig;
  onChange: (newConfig: FloatCueConfig) => void;
  onActivate: () => void;
  isOverlayActive: boolean;
  
  // Real-time microphone and speech states
  micActive: boolean;
  setMicActive: (active: boolean) => void;
  speechError: string | null;
  setSpeechError: (error: string | null) => void;
  isSimulatingVoice: boolean;
  onStartVoiceSimulation: () => void;
  onStopVoiceSimulation: () => void;
  speechTranscript: string;
  isAutoScrollPlaying?: boolean;
  autoScrollCountdown?: number | null;
  onStartAutoScroll?: () => void;
  onPauseAutoScroll?: () => void;
  onResetAutoScroll?: () => void;
  onTogglePiP?: () => void;
  isPipActive?: boolean;
}

export default function MainConsole({
  config,
  onChange,
  onActivate,
  isOverlayActive,
  micActive,
  setMicActive,
  speechError,
  setSpeechError,
  isSimulatingVoice,
  onStartVoiceSimulation,
  onStopVoiceSimulation,
  speechTranscript,
  isAutoScrollPlaying,
  autoScrollCountdown,
  onStartAutoScroll,
  onPauseAutoScroll,
  onResetAutoScroll,
  onTogglePiP,
  isPipActive = false
}: MainConsoleProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Parse lines whenever the large text block changes
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const rawText = e.target.value;
    const segments: string[] = [];
    const rawBlocks = rawText.split('\n');
    
    rawBlocks.forEach(block => {
      const trimmedBlock = block.trim();
      if (!trimmedBlock) return;
      
      // Split by sentence endings: 。 ！？ ! ? (keeping punctuation)
      const sentences = trimmedBlock.split(/(?<=[。！？\?!])/g);
      sentences.forEach(s => {
        const trimmedS = s.trim();
        if (trimmedS.length > 0) {
          segments.push(trimmedS);
        }
      });
    });

    const splitLines = segments.map((text, index) => ({
      id: (index + 1).toString(),
      text
    }));

    onChange({
      ...config,
      text: rawText,
      lines: splitLines.length > 0 ? splitLines : [{ id: '1', text: rawText }],
    });
  };

  // Switch presets helper
  const handleLoadPresetScript = () => {
    const rawText = DEFAULT_SCRIPT_LINES.map(l => l.text).join('\n');
    onChange({
      ...config,
      text: rawText,
      lines: DEFAULT_SCRIPT_LINES,
      contentMode: 'text'
    });
  };

  // Handle local file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    const isVideo = file.type.startsWith('video/');
    const isImage = file.type.startsWith('image/');

    if (isImage) {
      onChange({
        ...config,
        contentMode: 'image',
        mediaUrl: url,
        mediaType: 'image'
      });
    } else if (isVideo) {
      onChange({
        ...config,
        contentMode: 'video',
        mediaUrl: url,
        mediaType: 'video'
      });
    }
  };

  // Clear imported media and revert to text mode
  const handleClearMedia = () => {
    onChange({
      ...config,
      contentMode: 'text',
      mediaUrl: null,
      mediaType: null
    });
  };

  return (
    <div className="flex flex-col h-full bg-[#050505] border-r border-white/10 p-8 lg:p-10 justify-between select-none overflow-y-auto">
      {/* Upper Brand and Description */}
      <div className="flex flex-col gap-8">
        <header className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center">
              <div className="w-5 h-5 bg-black rounded-full"></div>
            </div>
            <h1 className="text-2xl font-semibold tracking-tight uppercase font-display text-white">FloatCue</h1>
          </div>
          <div className="text-xs text-white/40 font-mono tracking-widest">v1.0.0 PRO EDITION</div>
        </header>

        <p className="text-xs text-white/40 leading-relaxed font-light -mt-4">
          极致轻量的越级悬浮提词与画中画构图工具，通过端侧瞳孔分析与实时环境声学实现智能人机跟随。
        </p>

        {/* SECTION 1: CONTENT INPUT & SWITCHES */}
        <div className="flex flex-col gap-5">
          {/* Top segment control: TEXT vs PIP REFERENCE */}
          <div className="flex bg-white/5 p-1 rounded-xl border border-white/5">
            <button
              onClick={() => handleClearMedia()}
              className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                config.contentMode === 'text'
                  ? 'bg-white text-black font-semibold shadow-md'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              <Type size={12} />
              <span>智能提词文本</span>
            </button>
            <button
              onClick={() => {
                if (config.mediaUrl) {
                  onChange({ ...config, contentMode: config.mediaType || 'image' });
                } else {
                  onChange({ ...config, contentMode: 'image' });
                }
              }}
              className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                config.contentMode !== 'text'
                  ? 'bg-white text-black font-semibold shadow-md'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              <ImageIcon size={12} />
              <span>画中画参考媒体</span>
            </button>
          </div>

          {/* MAIN WORKSPACE RENDERER */}
          {config.contentMode === 'text' ? (
            /* TEXT PROMPTER WORKSPACE */
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between px-1">
                <label className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-bold">
                  Teleprompter Content ({config.lines.length} Lines)
                </label>
                <button
                  onClick={handleLoadPresetScript}
                  className="text-white/40 hover:text-white text-[10px] font-mono border border-white/10 hover:border-white/20 px-2 py-0.5 rounded transition-all"
                >
                  加载口播预设
                </button>
              </div>

              <div className="relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-white/10 to-transparent rounded-2xl opacity-50"></div>
                <textarea
                  value={config.text}
                  onChange={handleTextChange}
                  placeholder="在此直接粘贴或输入您的提词文本，多行用回车分割..."
                  className="relative w-full h-44 bg-white/5 border border-white/10 rounded-2xl p-4 text-xs text-white/85 placeholder-white/20 focus:outline-none focus:border-white/30 resize-none font-sans leading-relaxed"
                />
                {config.text.trim() === '' && (
                  <div className="absolute inset-x-4 top-12 pointer-events-none flex flex-col gap-2">
                    <span className="text-[10px] text-white/20 font-light flex items-center gap-1">
                      💡 自动检测单行或多段，支持在开启浮窗后随时进行眼神与语音跟随。
                    </span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* PIP MEDIA WORKSPACE */
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between px-1">
                <label className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-bold">
                  Media Reference (画中画构图)
                </label>
                <button
                  onClick={handleClearMedia}
                  className="text-red-400 hover:text-red-300 text-[10px] flex items-center gap-1 font-mono"
                >
                  <Trash2 size={10} />
                  <span>清除媒体并回到文字模式</span>
                </button>
              </div>

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept="image/*,video/*"
                className="hidden"
              />

              {config.mediaUrl ? (
                /* MEDIA CONSOLE DETAILS AND PREVIEW */
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center gap-4 relative overflow-hidden">
                  <div className="w-16 h-16 rounded-lg bg-neutral-900 border border-white/10 flex items-center justify-center overflow-hidden">
                    {config.mediaType === 'image' ? (
                      <img 
                        src={config.mediaUrl} 
                        alt="PIP" 
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover" 
                      />
                    ) : (
                      <video 
                        src={config.mediaUrl} 
                        className="w-full h-full object-cover" 
                        muted 
                        loop 
                        autoPlay 
                      />
                    )}
                  </div>

                  <div className="flex-1 flex flex-col gap-1.5 min-w-0">
                    <div className="flex items-center gap-1.5">
                      {config.mediaType === 'image' ? (
                        <span className="text-[9px] font-mono bg-indigo-500/10 text-indigo-400 px-1.5 py-0.5 rounded">IMAGE</span>
                      ) : (
                        <span className="text-[9px] font-mono bg-amber-500/10 text-amber-400 px-1.5 py-0.5 rounded">VIDEO</span>
                      )}
                      <span className="text-[10px] text-white/40 truncate">构图与舞蹈卡点参考源</span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-white/80 truncate font-medium">已导入自定义画中画内容</span>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="text-[10px] text-indigo-400 hover:text-indigo-300 font-mono underline"
                      >
                        换一个
                      </button>
                    </div>
                    
                    {/* Hover Opacity Controller */}
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[9px] text-white/40">初始不透明度:</span>
                      <input
                        type="range"
                        min="20"
                        max="100"
                        value={config.opacity}
                        onChange={(e) => onChange({ ...config, opacity: parseInt(e.target.value) })}
                        className="flex-1 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-white"
                      />
                      <span className="text-[9px] font-mono text-white/60">{config.opacity}%</span>
                    </div>
                  </div>
                </div>
              ) : (
                /* EMPTY + ICON IMPORT BUTTON */
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-44 bg-white/5 hover:bg-white/10 border-2 border-dashed border-white/10 hover:border-white/20 rounded-2xl flex flex-col items-center justify-center gap-3 cursor-pointer transition-all"
                >
                  <div className="h-12 w-12 rounded-full bg-white/5 flex items-center justify-center text-white/50 border border-white/5">
                    <Plus size={20} className="text-white/60" />
                  </div>
                  <div className="text-center flex flex-col gap-1">
                    <span className="text-xs text-white/80 font-medium">点击导入图片或视频</span>
                    <span className="text-[10px] text-white/30">支持从设备相册导入自定义构图或舞蹈视频</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* SECTION 2: ALGORITHM CONTROL SWITCHES */}
          <div className="flex flex-col gap-4 bg-white/5 border border-white/10 rounded-2xl p-5">
            <h3 className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-bold border-b border-white/10 pb-2.5 mb-1 flex items-center gap-1.5">
              <SlidersHorizontal size={10} />
              <span>Smart Interaction (端侧智能算法)</span>
            </h3>

            {/* SWITCH: VOICE SCROLLING (Text Mode Only) */}
            <div className={`flex items-start justify-between gap-4 transition-all duration-300 ${
              config.contentMode !== 'text' ? 'opacity-40 pointer-events-none' : ''
            }`}>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-medium text-white/90">语音同步滚动 (Speech-Sync)</span>
                  <span className="text-[8px] font-mono bg-sky-500/10 text-sky-400 px-1 py-0.2 rounded font-semibold tracking-wider">AI</span>
                </div>
                <p className="text-[10px] text-white/40 leading-relaxed font-light">
                  调用麦克风接收人声，端侧匹配识别您读到的文字，自动将当前句置顶黄金高亮区。
                </p>
              </div>

              <label className="relative inline-flex items-center cursor-pointer mt-0.5 shrink-0">
                <input
                  type="checkbox"
                  disabled={config.contentMode !== 'text'}
                  checked={config.voiceScrolling}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    onChange({ ...config, voiceScrolling: checked });
                    if (checked) {
                      setMicActive(true);
                    } else {
                      setMicActive(false);
                      onStopVoiceSimulation();
                    }
                  }}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-white/10 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-neutral-400 peer-checked:after:bg-black after:border-none after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-white transition-colors duration-200"></div>
              </label>
            </div>

            {/* SWITCH: AUTO SCROLLING (Text Mode Only) */}
            <div className={`flex items-start justify-between gap-4 transition-all duration-300 border-t border-white/5 pt-3 ${
              config.contentMode !== 'text' ? 'opacity-40 pointer-events-none' : ''
            }`}>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-medium text-white/90">自动匀速滚动 (Auto-Scroll)</span>
                  <span className="text-[8px] font-mono bg-emerald-500/10 text-emerald-400 px-1 py-0.2 rounded font-semibold tracking-wider">AUTO</span>
                </div>
                <p className="text-[10px] text-white/40 leading-relaxed font-light">
                  无需进行语音识别，按照固定的停留时间自动向下平滑滚动，更稳定无感。
                </p>
              </div>

              <label className="relative inline-flex items-center cursor-pointer mt-0.5 shrink-0">
                <input
                  type="checkbox"
                  disabled={config.contentMode !== 'text'}
                  checked={!!config.autoScroll}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    onChange({ ...config, autoScroll: checked });
                  }}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-white/10 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-neutral-400 peer-checked:after:bg-black after:border-none after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-white transition-colors duration-200"></div>
              </label>
            </div>

            {/* SLIDER: AUTO SCROLL SPEED (Only visible when autoScroll is checked) */}
            {config.autoScroll && (
              <div className="flex flex-col gap-1.5 border-t border-white/5 pt-3 animate-fade-in">
                <div className="flex items-center justify-between text-xs text-white/90">
                  <span>自动滚动每行停留 (Seconds Per Line)</span>
                  <span className="text-[10px] font-mono text-white/50 bg-white/5 px-1.5 py-0.2 rounded font-semibold">
                    {(config.autoScrollSpeed !== undefined ? config.autoScrollSpeed : 6.0).toFixed(1)} 秒/行
                  </span>
                </div>
                <p className="text-[10px] text-white/40 leading-relaxed font-light">
                  设置每行文字在屏幕中心停留的时间（单位：秒），数值越小滚动越快。
                </p>
                <div className="flex items-center gap-3 mt-1">
                  <input
                    type="range"
                    min="3.0"
                    max="10.0"
                    step="0.1"
                    value={config.autoScrollSpeed !== undefined ? config.autoScrollSpeed : 6.0}
                    onChange={(e) => onChange({ ...config, autoScrollSpeed: parseFloat(e.target.value) })}
                    className="flex-1 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-white"
                  />
                </div>

                {/* PLAYBACK CONTROLS: START/PAUSE/RESET */}
                <div className="flex flex-col gap-2 mt-3 border-t border-white/5 pt-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase tracking-wider text-white/40 font-mono">滚动状态与控制</span>
                    {autoScrollCountdown !== null && (
                      <span className="text-[10px] font-mono text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded animate-pulse">
                        倒计时 {autoScrollCountdown}s...
                      </span>
                    )}
                    {isAutoScrollPlaying && (
                      <span className="text-[10px] font-mono text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded animate-pulse">
                        正在匀速滚动
                      </span>
                    )}
                    {!isAutoScrollPlaying && autoScrollCountdown === null && (
                      <span className="text-[10px] font-mono text-white/30 bg-white/5 px-1.5 py-0.5 rounded">
                        已停止
                      </span>
                    )}
                  </div>

                  <div className="flex gap-2 mt-1">
                    {isAutoScrollPlaying ? (
                      <button
                        onClick={onPauseAutoScroll}
                        type="button"
                        className="flex-1 py-2 rounded-xl text-[11px] font-medium flex items-center justify-center gap-1.5 border border-amber-500/30 bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 transition-all cursor-pointer"
                      >
                        <span>暂停滚动</span>
                      </button>
                    ) : (
                      <button
                        onClick={onStartAutoScroll}
                        type="button"
                        disabled={autoScrollCountdown !== null}
                        className={`flex-1 py-2 rounded-xl text-[11px] font-medium flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                          autoScrollCountdown !== null
                            ? 'border-neutral-800 bg-neutral-900/50 text-neutral-500 cursor-not-allowed'
                            : 'border-emerald-500/30 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                        }`}
                      >
                        <span>开始滚动 (3s延迟)</span>
                      </button>
                    )}

                    <button
                      onClick={onResetAutoScroll}
                      type="button"
                      className="py-2 px-4 rounded-xl text-[11px] font-medium border border-white/10 bg-white/5 text-white/80 hover:bg-white/10 transition-all cursor-pointer"
                    >
                      <span>重置</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* SECTION 2.5: STYLE & LAYOUT CONTROLS */}
          <div className="flex flex-col gap-4 bg-white/5 border border-white/10 rounded-2xl p-5">
            <h3 className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-bold border-b border-white/10 pb-2.5 mb-1 flex items-center gap-1.5">
              <SlidersHorizontal size={10} />
              <span>Style & Layout (外观与字号微调)</span>
            </h3>

            {/* SLIDER: FONT SIZE (Only for Text Mode) */}
            <div className={`flex flex-col gap-1.5 transition-all duration-300 ${
              config.contentMode !== 'text' ? 'opacity-40 pointer-events-none' : ''
            }`}>
              <div className="flex items-center justify-between text-xs text-white/90">
                <span>提词器字号 (Font Size)</span>
                <span className="text-[10px] font-mono text-white/50 bg-white/5 px-1.5 py-0.2 rounded font-semibold">
                  {config.fontSize || 18} px
                </span>
              </div>
              <p className="text-[10px] text-white/40 leading-relaxed font-light">
                微调提词器的字体大小。字号越大看得越清，字号越小能展示的段落越多。
              </p>
              <div className="flex items-center gap-3 mt-1">
                <input
                  type="range"
                  min="12"
                  disabled={config.contentMode !== 'text'}
                  max="32"
                  value={config.fontSize || 18}
                  onChange={(e) => onChange({ ...config, fontSize: parseInt(e.target.value) })}
                  className="flex-1 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-white"
                />
              </div>
            </div>

            {/* SLIDER: OPACITY */}
            <div className="flex flex-col gap-1.5 border-t border-white/5 pt-4 mt-1">
              <div className="flex items-center justify-between text-xs text-white/90">
                <span>浮窗背景不透明度 (Window Opacity)</span>
                <span className="text-[10px] font-mono text-white/50 bg-white/5 px-1.5 py-0.2 rounded font-semibold">
                  {config.opacity !== undefined ? config.opacity : 85}%
                </span>
              </div>
              <p className="text-[10px] text-white/40 leading-relaxed font-light">
                调整提词器悬浮窗口背景的透明度，调低可以让您看清浮窗下方的其他背景画面。
              </p>
              <div className="flex items-center gap-3 mt-1">
                <input
                  type="range"
                  min="10"
                  max="100"
                  step="5"
                  value={config.opacity !== undefined ? config.opacity : 85}
                  onChange={(e) => onChange({ ...config, opacity: parseInt(e.target.value) })}
                  className="flex-1 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-white"
                />
              </div>
            </div>
          </div>

          {/* SECTION 3: VOICE-SYNC DOCK TESTER PANEL */}
          {config.contentMode === 'text' && (config.voiceScrolling || config.autoScroll) && (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex flex-col gap-3 animate-fade-in">
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-sky-400 font-bold">
                  <Mic size={12} className="animate-pulse" />
                  <span>Speech Sync Monitor (语音滚动监测)</span>
                </div>
                <span className="text-[8px] font-mono text-white/30 uppercase tracking-widest">Local Engine</span>
              </div>

              <div className="flex items-center gap-2">
                {/* Real mic toggle */}
                <button
                  onClick={() => {
                    onStopVoiceSimulation();
                    setMicActive(!micActive);
                  }}
                  className={`flex-1 py-2 rounded-xl text-[11px] font-medium flex items-center justify-center gap-1.5 border transition-all ${
                    micActive
                      ? 'bg-red-500/20 text-red-400 border-red-500/30'
                      : 'bg-white/5 text-white/80 border-white/10 hover:bg-white/10'
                  }`}
                >
                  <Mic size={12} />
                  <span>{micActive ? '关闭麦克风' : '开启麦克风读词'}</span>
                </button>

                {/* Simulated vocal TTS engine */}
                <button
                  onClick={() => {
                    setMicActive(false);
                    if (isSimulatingVoice) {
                      onStopVoiceSimulation();
                    } else {
                      onStartVoiceSimulation();
                    }
                  }}
                  className={`flex-1 py-2 rounded-xl text-[11px] font-medium flex items-center justify-center gap-1.5 border transition-all ${
                    isSimulatingVoice
                      ? 'bg-amber-500/20 text-amber-400 border-amber-500/30 animate-pulse'
                      : 'bg-white/5 text-white/80 border-white/10 hover:bg-white/10'
                  }`}
                >
                  <Volume2 size={12} />
                  <span>{isSimulatingVoice ? '停止模拟器' : '模拟人声自动朗读'}</span>
                </button>
              </div>

              {/* If permission denied error exists, show beautiful detailed helper instruction */}
              {speechError === 'not-allowed' && (
                <div className="bg-amber-950/30 border border-amber-500/20 rounded-xl p-3 flex flex-col gap-1.5 animate-fade-in text-left">
                  <div className="flex items-center gap-1.5 text-[10px] text-amber-400 font-bold">
                    <AlertTriangle size={12} className="shrink-0" />
                    <span>麦克风录音访问受限 (not-allowed)</span>
                  </div>
                  <p className="text-[10px] text-white/70 leading-relaxed font-light">
                    由于浏览器安全沙盒限制或麦克风授权被拒，当前无法使用真实声音控制滚动。
                  </p>
                  <div className="bg-black/30 p-2 rounded-lg border border-white/5 flex flex-col gap-1.5">
                    <button
                      onClick={() => {
                        setSpeechError(null);
                        onStartVoiceSimulation();
                      }}
                      className="w-full text-left text-[9px] text-amber-400 font-bold hover:underline flex items-center gap-1"
                    >
                      <span>➔ 立即点击此处启用『人声模拟自动朗读』</span>
                    </button>
                    <p className="text-[9px] text-white/40 leading-relaxed pl-3.5 font-light">
                      系统将极速调用本地高仿真合成人声（TTS）为您示范朗读文案，高亮和滚动完美随声音极速同步！
                    </p>
                    <p className="text-[8px] text-white/30 leading-normal pl-3.5 border-t border-white/5 pt-1 mt-0.5">
                      若后续要使用实体麦克风，请点击浏览器上方地址栏的 🔒 安全锁图标，将麦克风设为「允许」并重新加载页面。
                    </p>
                  </div>
                </div>
              )}

              {/* Status transcript helper */}
              <div className="bg-black/40 border border-white/5 rounded-lg p-2 min-h-8 flex flex-col justify-center">
                {micActive ? (
                  <div className="flex items-center gap-2 text-[10px] text-sky-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-sky-500 animate-ping shrink-0" />
                    <span className="font-light italic truncate">
                      {speechTranscript ? `听到了: "${speechTranscript}"` : '请开始读屏幕上的任何一段词...'}
                    </span>
                  </div>
                ) : isSimulatingVoice ? (
                  <div className="flex items-center gap-2 text-[10px] text-amber-400">
                    <Volume2 size={12} className="animate-bounce shrink-0" />
                    <span className="font-light leading-relaxed truncate">
                      系统正在通过 TTS 朗读句子，自动高亮并极速滚动！
                    </span>
                  </div>
                ) : (
                  <span className="text-[10px] text-white/30 text-center font-light">
                    点击上方按钮进行声音对照或启动高仿真人声模拟朗读。
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* CORE CONTROL LAUNCH BUTTON */}
      <div className="flex flex-col gap-3 mt-6 border-t border-white/5 pt-5">
        {/* Compliance and privacy disclosure */}
        <div className="flex items-start gap-2 text-[10px] text-white/30 font-light">
          <ShieldCheck size={14} className="text-emerald-500/70 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            FloatCue 严格遵循无感端侧运行协议。人脸跟踪和语音处理完全在您的设备本地端进行，绝不上传云端，零流量、不发热、极致省电。
          </p>
        </div>

        {/* Action Buttons Container */}
        <div className="flex flex-col gap-2.5">
          {/* Button 1: Normal In-App Floating Overlay + PiP System-Wide Overlay */}
          <button
            onClick={onActivate}
            className={`w-full py-3.5 rounded-2xl font-display font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
              isOverlayActive
                ? 'bg-white/10 text-white/60 hover:bg-white/20 hover:text-white border border-white/10'
                : 'bg-white text-black hover:bg-neutral-100 shadow-[0_8px_30px_rgb(255,255,255,0.15)] active:scale-[0.98]'
            }`}
          >
            {isOverlayActive ? (
              <>
                <SlidersHorizontal size={14} />
                <span>微调 FloatCue 设置</span>
              </>
            ) : (
              <>
                <Play size={14} fill="currentColor" />
                <span>开启 FloatCue 灵动浮窗</span>
              </>
            )}
          </button>
        </div>

        {/* iOS Picture in Picture Guideline card */}
        <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-2xl p-3.5 mt-2 flex flex-col gap-1.5">
          <div className="flex items-center gap-2 text-[10px] text-emerald-400 font-bold tracking-wider uppercase">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>iOS 手机专属 ∙ 跨软件悬浮攻略</span>
          </div>
          <p className="text-[10px] text-white/50 leading-relaxed">
            因 iOS 苹果系统沙盒安全限制，标准网页无法直接跨软件悬浮。<strong>FloatCue 特别研发“越级悬浮画中画技术”</strong>：
          </p>
          <ol className="text-[10px] text-white/40 list-decimal pl-4 space-y-1 leading-relaxed">
            <li>点击上方的 <span className="text-emerald-400 font-medium">开启 FloatCue 灵动浮窗</span> 按钮</li>
            <li>在弹出的系统浮窗右上方，点击“画中画缩放”图标将其悬浮</li>
            <li>此时您可以<strong>直接划掉 Safari 浏览器，打开系统相机、抖音、微信</strong>，提词窗依然会悬浮在屏幕最上层自动滚动！</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
