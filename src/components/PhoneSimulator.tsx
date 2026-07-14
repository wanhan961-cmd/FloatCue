import React, { useRef, useEffect, useState } from 'react';
import { Camera, CameraOff, RefreshCw, Zap, Volume2, Mic, ShieldCheck, Sparkles, Smartphone, Play, Square } from 'lucide-react';
import { FloatCueConfig } from '../types';
import FloatingCueWidget from './FloatingCueWidget';

interface PhoneSimulatorProps {
  config: FloatCueConfig;
  activeLineId: string;
  onActiveLineChange?: (id: string) => void;
  isOverlayActive: boolean;
  onDeactivate: () => void;
  onScaleChange: (scale: number) => void;
  onOpacityChange: (opacity: number) => void;
  onFontSizeChange: (size: number) => void;
  onAutoScrollToggle?: (enabled: boolean) => void;
  onAutoScrollSpeedChange?: (speed: number) => void;
  speechTranscript: string;
  isSimulatingVoice: boolean;
  isAutoScrollPlaying?: boolean;
  autoScrollCountdown?: number | null;
  onStartAutoScroll?: () => void;
  onPauseAutoScroll?: () => void;
  onResetAutoScroll?: () => void;
  micActive: boolean;
  isMobile?: boolean;
}

export default function PhoneSimulator({
  config,
  activeLineId,
  onActiveLineChange,
  isOverlayActive,
  onDeactivate,
  onScaleChange,
  onOpacityChange,
  onFontSizeChange,
  onAutoScrollToggle,
  onAutoScrollSpeedChange,
  speechTranscript,
  isSimulatingVoice,
  isAutoScrollPlaying,
  autoScrollCountdown,
  onStartAutoScroll,
  onPauseAutoScroll,
  onResetAutoScroll,
  micActive,
  isMobile = false
}: PhoneSimulatorProps) {
  const screenRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  const [webcamEnabled, setWebcamEnabled] = useState(false);
  const [webcamError, setWebcamError] = useState<string | null>(null);
  const [showGuides, setShowGuides] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Standard coordinate space for iPhone 17 (350x758)
  // Float starts nicely in the upper-third golden recording zone
  const [floatPos, setFloatPos] = useState({ x: 175, y: 160 });

  // Handle webcam stream
  useEffect(() => {
    let stream: MediaStream | null = null;
    if (webcamEnabled && isOverlayActive) {
      navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false })
        .then((s) => {
          stream = s;
          if (videoRef.current) {
            videoRef.current.srcObject = s;
          }
          setWebcamError(null);
        })
        .catch((err) => {
          console.error("Camera access failed", err);
          setWebcamError("摄像头访问未授权或不可用");
          setWebcamEnabled(false);
        });
    } else {
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [webcamEnabled, isOverlayActive]);

  // Handle manual dragging bounds relative to iPhone 17 viewport
  const handleFloatPositionChange = (pos: { x: number; y: number }) => {
    // Rely on precise, scale-aware boundary clamping inside the FloatingCueWidget component itself
    setFloatPos(pos);
  };

  // Simulated visual voice waveform height multipliers
  const [waveHeights, setWaveHeights] = useState<number[]>([10, 10, 10, 10, 10, 10, 10]);
  useEffect(() => {
    if (!isOverlayActive || (!isSimulatingVoice && !speechTranscript)) {
      setWaveHeights([10, 10, 10, 10, 10, 10, 10]);
      return;
    }

    const interval = setInterval(() => {
      setWaveHeights(Array.from({ length: 7 }, () => Math.floor(Math.random() * 25) + 8));
    }, 120);

    return () => clearInterval(interval);
  }, [isOverlayActive, isSimulatingVoice, speechTranscript]);

  return (
    <div className="flex flex-col items-center justify-center w-full h-full p-4 lg:p-6 bg-[#0A0A0A] rounded-3xl border border-white/10 relative overflow-hidden select-none">
      {/* Background Grid Pattern for Tech Aesthetic */}
      <div className="absolute inset-0 bg-[radial-gradient(#ffffff03_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />

      {/* Top Header Panel of Sandbox with toggles */}
      <div className="w-full max-w-[360px] mb-4 flex items-center justify-between z-10">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-emerald-500" />
          <span className="text-[11px] font-mono uppercase tracking-wider text-white/60">
            iPhone 17 Live Mode
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowGuides(!showGuides)}
            className={`px-2 py-1 rounded text-[10px] font-mono border transition-all ${
              showGuides 
                ? 'bg-white/10 text-white border-white/20' 
                : 'bg-transparent text-white/40 border-white/5 hover:text-white/60'
            }`}
          >
            {showGuides ? '隐藏辅助线' : '显示辅助线'}
          </button>

          <button
            onClick={() => setWebcamEnabled(!webcamEnabled)}
            className={`px-2 py-1 rounded text-[10px] font-mono border flex items-center gap-1 transition-all ${
              webcamEnabled 
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' 
                : 'bg-transparent text-white/40 border-white/5 hover:text-white/60'
            }`}
          >
            <Camera size={10} />
            <span>{webcamEnabled ? '关闭镜头' : '启用前置镜'}</span>
          </button>
        </div>
      </div>

      {/* iPhone 17 Pro Max Simulator - Precise 19.5:9 Aspect Ratio (350px x 758px) */}
      <div 
        ref={screenRef}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={
          isMobile && isOverlayActive
            ? { width: '100%', height: '100%', borderRadius: '0px' }
            : { width: '350px', height: '758px', borderRadius: '54px' }
        }
        className={`relative bg-black border border-neutral-900 overflow-hidden select-none flex flex-col group cursor-crosshair ${
          isMobile && isOverlayActive
            ? 'shadow-none border-none'
            : 'shadow-[0_0_0_12px_#1F1F1F,0_0_0_13px_#121212,0_25px_50px_-12px_rgba(0,0,0,0.9)]'
        }`}
      >
        {/* iPhone 17 Sleek Dynamic Island / Pill Camera Capsule Punch Hole */}
        {(!isMobile || !isOverlayActive) && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 w-28 h-6 bg-black rounded-full z-50 flex items-center justify-between px-3 border border-white/10 shadow-lg">
            {/* Proximity & Ambient Light Sensor */}
            <div className="w-1.5 h-1.5 rounded-full bg-neutral-950" />
            {/* Dynamic Capsule Speaker Grill */}
            <div className="w-8 h-0.5 rounded-full bg-neutral-800" />
            {/* High-Fidelity Front Camera Lens with Blue Aperture Glass Highlight */}
            <div className="w-3.5 h-3.5 rounded-full bg-neutral-900 border border-neutral-800 relative flex items-center justify-center">
              <div className="w-1.5 h-1.5 bg-[#1a2b4c] rounded-full relative flex items-center justify-center">
                <div className="w-0.5 h-0.5 bg-sky-400 rounded-full animate-pulse" />
              </div>
            </div>
          </div>
        )}

        {/* Real-time filming interface details (overlays on camera background) */}
        <div className="absolute inset-x-6 top-14 flex items-center justify-between text-white/80 text-[10px] font-mono z-30 pointer-events-none">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-red-500 animate-ping" />
            <span className="font-semibold text-red-500">REC</span>
            <span>00:27</span>
          </div>
          <div className="bg-black/50 backdrop-blur-md px-2 py-0.5 rounded-full text-[9px] tracking-wider text-white/60 border border-white/5">
            19.5:9 ∙ 4K UHD
          </div>
        </div>

        {/* Camera Stage Backdrops */}
        <div className="absolute inset-0 w-full h-full bg-[#111111] z-10 overflow-hidden">
          {webcamEnabled ? (
            /* REAL WEBCAM MODE */
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover scale-x-[-1]"
            />
          ) : (
            /* PRE-RECORDED DYNAMIC MOCK CAMERA SCENE */
            <div className="w-full h-full relative flex items-center justify-center bg-gradient-to-br from-neutral-900 via-neutral-950 to-black">
              {/* Studio Grid overlay */}
              <div className="absolute inset-0 border border-white/[0.015]" />
              <div className="absolute top-1/3 inset-x-0 border-b border-white/[0.02] z-20" />
              <div className="absolute top-2/3 inset-x-0 border-b border-white/[0.02] z-20" />
              <div className="absolute left-1/3 inset-y-0 border-r border-white/[0.02] z-20" />
              <div className="absolute right-1/3 inset-y-0 border-r border-white/[0.02] z-20" />

              {/* Dynamic simulated vector model posture / webcam alternative */}
              <div className="flex flex-col items-center text-center gap-3 px-4 z-20">
                {webcamError ? (
                  <div className="bg-amber-950/45 border border-amber-500/25 backdrop-blur-md rounded-2xl p-4 flex flex-col items-center gap-2.5 max-w-[290px] text-center animate-fade-in shadow-2xl">
                    <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-400 border border-amber-500/15">
                      <CameraOff size={20} className="animate-pulse" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <span className="text-amber-400 font-bold text-xs tracking-wider">⚠️ 摄像头授权受限</span>
                      <p className="text-[9px] text-white/70 leading-normal text-left">
                        原因：浏览器或系统安全沙盒已默认拒绝了本页面的相机访问授权。这在 Iframe 预览环境中非常常见。
                      </p>
                      <div className="text-[8px] text-white/45 leading-relaxed text-left bg-black/45 p-2 rounded-xl border border-white/5 mt-1 flex flex-col gap-1">
                        <strong className="text-white/60">💡 极速解决方案：</strong>
                        <div>1. 点击浏览器地址栏左侧的 🔒 安全锁图标</div>
                        <div>2. 找到「摄像头 (Camera)」并设为「允许」并刷新页面</div>
                        <div>3. 或者您无需做任何配置，当前系统已自动为您启用<strong>『预置画质构图效果』</strong>，提词功能依然完美运作！</div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="relative">
                      <div className="w-24 h-24 rounded-full border-2 border-white/10 bg-neutral-800/80 flex items-center justify-center text-white/30 overflow-hidden shadow-2xl backdrop-blur-md">
                        <Sparkles size={36} className="text-white/30 animate-pulse" />
                      </div>
                    </div>
                    <div className="flex flex-col gap-1 text-center">
                      <span className="text-white/80 font-medium text-xs">前置真实画质构图</span>
                      <span className="text-white/40 text-[9px] leading-relaxed max-w-[210px]">
                        提词器将完全越级悬浮于此画面上方。点击右上角“启用前置镜”开启您的自媒体创作旅程！
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Double-click hint overlay when active */}
        {isOverlayActive && (
          <div className="absolute bottom-12 inset-x-0 text-center pointer-events-none z-30 flex justify-center">
            <span className="bg-black/70 backdrop-blur-md px-3.5 py-1 rounded-full text-[9px] text-white/50 border border-white/5">
              💡 拖动调整位置 ∙ 双击空白返回控制台
            </span>
          </div>
        )}

        {/* COMPOSITION ALGORITHM GUIDE LINES / DEBUGGER OVERLAYS */}
        {showGuides && isOverlayActive && (
          <div className="absolute inset-0 pointer-events-none z-20">
            {/* Upper 1/3 Horizon Golden Recording Zone */}
            <div className="absolute top-[252px] inset-x-0 border-t-2 border-dashed border-sky-500/25 flex justify-between items-start px-4 pt-1">
              <span className="text-[8px] font-mono text-sky-400/80 tracking-widest bg-black/60 px-1.5 py-0.5 rounded">
                GOLDEN VIEW ZONE (黄金视线区)
              </span>
              <span className="text-[8px] font-mono text-sky-400/80 bg-black/60 px-1.5 py-0.5 rounded">
                Y: 252px
              </span>
            </div>

            {/* Lens Camera Center Anchor Marker */}
            <div className="absolute top-[80px] left-[175px] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
              <div className="h-6 w-6 rounded-full border border-dashed border-amber-500/50 flex items-center justify-center">
                <div className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
              </div>
              <span className="text-[7px] font-mono text-amber-500 bg-black/75 px-1.5 py-0.2 rounded mt-1.5 whitespace-nowrap">
                CAMERA LENS CENTER
              </span>
            </div>

            {/* Real-time Dynamic Telemetry Display */}
            <div className="absolute bottom-20 left-4 bg-black/85 backdrop-blur-md border border-white/10 rounded-2xl p-3 font-mono text-[8px] text-white/60 flex flex-col gap-1.5 z-30 w-[185px]">
              <div className="text-white/40 font-semibold border-b border-white/5 pb-1 mb-0.5 tracking-wider">
                FLOATCUE LIVE SYSTEM
              </div>
              
              <div className="flex items-center justify-between">
                <span>画幅比例 (Ratio):</span>
                <span className="text-white/80">19.5 : 9 (Sleek)</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span>浮窗坐标 (Coord):</span>
                <span className="text-emerald-400">({Math.round(floatPos.x)}, {Math.round(floatPos.y)})</span>
              </div>

              <div className="flex items-center justify-between">
                <span>不透明度 (Opacity):</span>
                <span className="text-white/80">{config.opacity}%</span>
              </div>

              <div className="flex items-center justify-between">
                <span>显示尺寸 (Scale):</span>
                <span className="text-white/80">{Math.round(config.scale * 100)}%</span>
              </div>

              {config.contentMode === 'text' && (
                <div className="flex items-center justify-between">
                  <span>提词字号 (Font):</span>
                  <span className="text-white/80">{config.fontSize || 18}px</span>
                </div>
              )}

              {config.contentMode === 'text' && (
                <div className="flex flex-col gap-1 mt-1 border-t border-white/5 pt-1.5">
                  <div className="flex items-center justify-between">
                    <span>语音高亮同步:</span>
                    <span className={config.voiceScrolling ? 'text-sky-400 font-bold' : 'text-white/30'}>
                      {config.voiceScrolling ? 'ON 🎤' : 'MUTED'}
                    </span>
                  </div>

                  {/* Real-time voice sync waveform visualizer */}
                  {config.voiceScrolling && (
                    <div className="flex items-center gap-1 h-6 py-1 justify-center bg-white/[0.02] border border-white/5 rounded-lg my-1">
                      {waveHeights.map((h, i) => (
                        <div 
                          key={i} 
                          style={{ height: `${h}px` }} 
                          className="w-1 bg-sky-400 rounded-full transition-all duration-100" 
                        />
                      ))}
                    </div>
                  )}

                  {speechTranscript && (
                    <div className="text-[7.5px] text-sky-300 max-w-[160px] truncate mt-0.5 bg-black/40 px-1 py-0.5 rounded italic">
                      " {speechTranscript} "
                    </div>
                  )}
                  {isSimulatingVoice && (
                    <div className="text-[7px] text-amber-400 animate-pulse mt-0.5">
                      🔊 正在高拟真朗读同步...
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Double click empty background screen to return as fallback */}
        <div 
          className="absolute inset-0 z-10" 
          onDoubleClick={onDeactivate}
        />

        {/* THE MAIN ACTIVE FLOATING WIDGET COMPONENT */}
        {isOverlayActive && (
          <FloatingCueWidget
            config={config}
            activeLineId={activeLineId}
            onActiveLineChange={onActiveLineChange}
            onClose={onDeactivate}
            position={floatPos}
            onPositionChange={handleFloatPositionChange}
            onScaleChange={onScaleChange}
            onOpacityChange={onOpacityChange}
            onFontSizeChange={onFontSizeChange}
            onAutoScrollToggle={onAutoScrollToggle}
            onAutoScrollSpeedChange={onAutoScrollSpeedChange}
            isDraggingExternal={isDragging}
            setIsDraggingExternal={setIsDragging}
            isAutoScrollPlaying={isAutoScrollPlaying}
            autoScrollCountdown={autoScrollCountdown}
            onStartAutoScroll={onStartAutoScroll}
            onPauseAutoScroll={onPauseAutoScroll}
            onResetAutoScroll={onResetAutoScroll}
            isVoiceActive={micActive || isSimulatingVoice}
          />
        )}

        {/* Mobile floating exit button */}
        {isMobile && isOverlayActive && (
          <button
            onClick={onDeactivate}
            className="absolute bottom-8 right-6 z-50 bg-black/80 backdrop-blur-md border border-white/15 px-4 py-2 rounded-full text-xs font-semibold text-white/90 shadow-lg flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer"
          >
            <Smartphone size={14} className="text-emerald-400" />
            <span>返回设置</span>
          </button>
        )}

        {/* Bottom Simulated iOS Home Bar indicator */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-32 h-1 bg-white/20 rounded-full z-40 pointer-events-none" />
      </div>
    </div>
  );
}
