import React, { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Maximize2, 
  Eye, 
  Mic, 
  Volume2, 
  X, 
  Move, 
  Sliders, 
  RotateCcw,
  Zap,
  Play,
  Pause
} from 'lucide-react';
import { FloatCueConfig, PrompterLine } from '../types';

interface FloatingCueWidgetProps {
  config: FloatCueConfig;
  activeLineId: string;
  onActiveLineChange?: (id: string) => void;
  onClose: () => void;
  // Dragging states managed in parent or locally
  position: { x: number; y: number };
  onPositionChange: (pos: { x: number; y: number }) => void;
  onScaleChange: (scale: number) => void;
  onOpacityChange: (opacity: number) => void;
  onFontSizeChange?: (size: number) => void;
  onAutoScrollToggle?: (enabled: boolean) => void;
  onAutoScrollSpeedChange?: (speed: number) => void;
  isDraggingExternal: boolean;
  setIsDraggingExternal: (dragging: boolean) => void;
  isAutoScrollPlaying?: boolean;
  autoScrollCountdown?: number | null;
  onStartAutoScroll?: () => void;
  onPauseAutoScroll?: () => void;
  onResetAutoScroll?: () => void;
  isVoiceActive?: boolean;
}

export default function FloatingCueWidget({
  config,
  activeLineId,
  onActiveLineChange,
  onClose,
  position,
  onPositionChange,
  onScaleChange,
  onOpacityChange,
  onFontSizeChange,
  onAutoScrollToggle,
  onAutoScrollSpeedChange,
  isDraggingExternal,
  setIsDraggingExternal,
  isAutoScrollPlaying,
  autoScrollCountdown,
  onStartAutoScroll,
  onPauseAutoScroll,
  onResetAutoScroll,
  isVoiceActive = false
}: FloatingCueWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  const [showControls, setShowControls] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [elementStart, setElementStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Media Aspect Ratio & Video Countdown/Playing States
  const [mediaRatio, setMediaRatio] = useState<number | null>(null);
  const [videoCountdown, setVideoCountdown] = useState<number | null>(null);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Reset aspect ratio when media changes
  useEffect(() => {
    setMediaRatio(null);
  }, [config.mediaUrl]);

  // Video countdown timer
  useEffect(() => {
    if (videoCountdown === null) return;

    if (videoCountdown === 0) {
      setVideoCountdown(null);
      setIsVideoPlaying(true);
      if (videoRef.current) {
        videoRef.current.play().catch(err => {
          console.error("Video play failed:", err);
        });
      }
      return;
    }

    const timer = setTimeout(() => {
      setVideoCountdown(prev => (prev !== null ? prev - 1 : null));
    }, 1000);

    return () => clearTimeout(timer);
  }, [videoCountdown]);

  // Handle switching mode or clearing media - auto pause video
  useEffect(() => {
    if (config.contentMode !== 'video') {
      if (videoRef.current) {
        try {
          videoRef.current.pause();
        } catch (e) {}
      }
      setIsVideoPlaying(false);
      setVideoCountdown(null);
    }
  }, [config.contentMode]);

  // Border / Corner Resizing State
  const [isResizing, setIsResizing] = useState(false);
  const [resizeType, setResizeType] = useState<string | null>(null);
  const touchStartRef = useRef<{ dist: number; scale: number } | null>(null);

  // Triggered when clicking/touching active border zones
  const handleResizeStart = (e: React.PointerEvent, type: string) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    setResizeType(type);
    if (containerRef.current) {
      containerRef.current.setPointerCapture(e.pointerId);
    }
  };

  // Handle manual dragging with mouse/pointer
  const handlePointerDown = (e: React.PointerEvent) => {
    // Prevent dragging if interacting with sliders, buttons, or resize zones
    if ((e.target as HTMLElement).closest('.interactive-control')) {
      return;
    }
    
    // Check if double click on margins to return
    if (e.detail === 2) {
      onClose();
      return;
    }

    e.preventDefault();
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    setIsDraggingExternal(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    setElementStart({ x: position.x, y: position.y });
    
    if (containerRef.current) {
      containerRef.current.setPointerCapture(e.pointerId);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    // 1. Resizing mode
    if (isResizing && resizeType) {
      let targetScale = config.scale;
      
      if (resizeType === 'e' || resizeType === 'w') {
        const currentDistX = Math.abs(e.clientX - position.x);
        targetScale = currentDistX / (baseWidth / 2);
      } else if (resizeType === 'n' || resizeType === 's') {
        const currentDistY = Math.abs(e.clientY - position.y);
        targetScale = currentDistY / (baseHeight / 2);
      } else {
        // Corners: nw, ne, sw, se
        const currentDist = Math.sqrt(Math.pow(e.clientX - position.x, 2) + Math.pow(e.clientY - position.y, 2));
        const baseDist = Math.sqrt(Math.pow(baseWidth / 2, 2) + Math.pow(baseHeight / 2, 2));
        targetScale = currentDist / baseDist;
      }
      
      // Limit scale tightly to [0.75, 1.20] so it remains highly legible and fits phone container perfectly
      const boundedScale = Math.max(0.75, Math.min(1.20, targetScale));
      onScaleChange(Number(boundedScale.toFixed(2)));
      return;
    }

    // 2. Moving mode
    if (!isDraggingExternal || !dragStart) return;
    
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    
    const targetX = elementStart.x + dx;
    const targetY = elementStart.y + dy;

    // Viewport size of iPhone 17 Simulator is 350px by 758px.
    // Clamp coordinates so that the widget's edges never exceed the phone screen bounds
    const halfWidth = currentWidth / 2;
    const halfHeight = currentHeight / 2;
    
    const clampedX = Math.max(halfWidth, Math.min(350 - halfWidth, targetX));
    const clampedY = Math.max(halfHeight, Math.min(758 - halfHeight, targetY));

    onPositionChange({
      x: clampedX,
      y: clampedY
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isResizing) {
      setIsResizing(false);
      setResizeType(null);
      if (containerRef.current) {
        containerRef.current.releasePointerCapture(e.pointerId);
      }
    }
    if (isDraggingExternal) {
      setIsDraggingExternal(false);
      setDragStart(null);
      if (containerRef.current) {
        containerRef.current.releasePointerCapture(e.pointerId);
      }
    }
  };

  // Two-finger pinch touch gestures
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      touchStartRef.current = { dist, scale: config.scale };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && touchStartRef.current) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      const targetScale = touchStartRef.current.scale * (dist / touchStartRef.current.dist);
      // Limit scale tightly to [0.75, 1.20] so it remains highly legible and fits phone container perfectly
      const boundedScale = Math.max(0.75, Math.min(1.20, targetScale));
      onScaleChange(Number(boundedScale.toFixed(2)));
    }
  };

  const handleTouchEnd = () => {
    touchStartRef.current = null;
  };

  // Double click event handler on border/margins
  const handleDoubleClick = (e: React.MouseEvent) => {
    if (!(e.target as HTMLElement).closest('.interactive-control')) {
      onClose();
    }
  };

  const activeLineIdRef = useRef(activeLineId);
  useEffect(() => {
    activeLineIdRef.current = activeLineId;
  }, [activeLineId]);

  const vocalProgressRef = useRef(config.vocalProgress);
  useEffect(() => {
    vocalProgressRef.current = config.vocalProgress;
  }, [config.vocalProgress]);

  // Smooth scroll active prompter line to the center of the widget
  useEffect(() => {
    if (config.contentMode !== 'text' || !scrollContainerRef.current) return;
    if (isAutoScrollPlaying) return; // CRITICAL: Skip while actively smooth scrolling
    if (config.voiceScrolling) return; // CRITICAL: Skip when voice scrolling runs its own real-time LERP animation loop!

    const activeEl = scrollContainerRef.current.querySelector(`[data-line-id="${activeLineId}"]`);
    if (activeEl) {
      const containerHeight = scrollContainerRef.current.clientHeight;
      const elementOffsetTop = (activeEl as HTMLElement).offsetTop;
      const elementHeight = (activeEl as HTMLElement).clientHeight;

      // Scroll to center
      scrollContainerRef.current.scrollTo({
        top: elementOffsetTop - containerHeight / 2 + elementHeight / 2,
        behavior: config.autoScroll && (config.autoScrollSpeed || 1.0) < 0.8 ? 'auto' : 'smooth'
      });
    }
  }, [activeLineId, config.contentMode, config.lines, isAutoScrollPlaying, config.voiceScrolling]);

  // Real-time Voice Synchronization Smooth LERP Scrolling Engine
  const voiceRequestRef = useRef<number | null>(null);

  useEffect(() => {
    if (!config.voiceScrolling || config.contentMode !== 'text' || !scrollContainerRef.current || isAutoScrollPlaying) {
      if (voiceRequestRef.current) {
        cancelAnimationFrame(voiceRequestRef.current);
        voiceRequestRef.current = null;
      }
      return;
    }

    const scrollContainer = scrollContainerRef.current;
    
    const animateVoiceScroll = () => {
      const currentActiveId = activeLineIdRef.current;
      const activeEl = scrollContainer.querySelector(`[data-line-id="${currentActiveId}"]`);
      if (activeEl) {
        const containerHeight = scrollContainer.clientHeight;
        const elementOffsetTop = (activeEl as HTMLElement).offsetTop;
        const elementHeight = (activeEl as HTMLElement).clientHeight;

        // Ideal centered position of the current active subtitle line
        const offsetCurrent = elementOffsetTop - containerHeight / 2 + elementHeight / 2;

        // Ideal centered position of the next subtitle line (to interpolate towards)
        const nextEl = activeEl.nextElementSibling;
        let offsetNext = offsetCurrent;
        if (nextEl && (nextEl as HTMLElement).dataset?.lineId) {
          const nextOffsetTop = (nextEl as HTMLElement).offsetTop;
          const nextHeight = (nextEl as HTMLElement).clientHeight;
          offsetNext = nextOffsetTop - containerHeight / 2 + nextHeight / 2;
        }

        // Interpolate the target scroll position based on micro vocal progress of current line
        const progress = vocalProgressRef.current || 0;
        const targetScrollTop = offsetCurrent + progress * (offsetNext - offsetCurrent);

        // Compute current scroll position
        const currentScroll = scrollContainer.scrollTop;
        const delta = targetScrollTop - currentScroll;

        // Apply a highly buttery linear interpolation with slew-rate limiting (Challenge 6)
        // Limits scrolling speed to a maximum of 3.5 pixels per frame at 60fps (preventing jarring jumps)
        const maxScrollPerFrame = 3.5 * config.scale;
        let step = delta * 0.08; // Butter smooth LERP factor

        if (step > maxScrollPerFrame) {
          step = maxScrollPerFrame;
        } else if (step < -maxScrollPerFrame) {
          step = -maxScrollPerFrame;
        }

        if (Math.abs(delta) > 0.1) {
          scrollContainer.scrollTop = currentScroll + step;
        } else {
          scrollContainer.scrollTop = targetScrollTop;
        }
      }

      voiceRequestRef.current = requestAnimationFrame(animateVoiceScroll);
    };

    voiceRequestRef.current = requestAnimationFrame(animateVoiceScroll);

    return () => {
      if (voiceRequestRef.current) {
        cancelAnimationFrame(voiceRequestRef.current);
        voiceRequestRef.current = null;
      }
    };
  }, [config.voiceScrolling, config.contentMode, isAutoScrollPlaying, config.scale]);

  const requestRef = useRef<number | null>(null);
  const previousTimeRef = useRef<number | null>(null);
  const playTimeRef = useRef<number>(0);
  const configLinesRef = useRef(config.lines);

  useEffect(() => {
    configLinesRef.current = config.lines;
  }, [config.lines]);

  const updateActiveLineBasedOnScrollPosition = (container: HTMLDivElement) => {
    const linesEls = container.querySelectorAll('[data-line-id]');
    if (linesEls.length === 0) return;

    const containerHeight = container.clientHeight;
    // The visual active center line is exactly in the middle of the container
    const containerCenter = container.scrollTop + containerHeight / 2;
    
    let closestLineId = '';
    let minDistance = Infinity;

    linesEls.forEach((el) => {
      const htmlEl = el as HTMLElement;
      const elCenter = htmlEl.offsetTop + htmlEl.offsetHeight / 2;
      const distance = Math.abs(containerCenter - elCenter);
      
      if (distance < minDistance) {
        minDistance = distance;
        closestLineId = htmlEl.dataset.lineId || '';
      }
    });

    if (closestLineId && closestLineId !== activeLineIdRef.current) {
      if (onActiveLineChange) {
        onActiveLineChange(closestLineId);
      }
    }
  };

  useEffect(() => {
    if (!isAutoScrollPlaying || config.contentMode !== 'text' || !scrollContainerRef.current) {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
        requestRef.current = null;
      }
      return;
    }

    const scrollContainer = scrollContainerRef.current;
    playTimeRef.current = 0; // Reset playing time on play start
    
    // If the active line is the first line, reset the scroll to exactly 0 to start perfectly aligned
    const lines = configLinesRef.current;
    if (lines.length > 0 && activeLineIdRef.current === lines[0].id) {
      scrollContainer.scrollTop = 0;
    }
    
    // Track precise starting position and floating-point scroll position
    const startingScrollTop = scrollContainer.scrollTop;
    let preciseScrollTop = startingScrollTop;
    
    const animate = (time: number) => {
      if (previousTimeRef.current !== null) {
        const deltaTime = (time - previousTimeRef.current) / 1000; // in seconds
        
        // Accumulate playing time
        playTimeRef.current += deltaTime;
        
        // Find average line height from rendered DOM for absolute precision
        const lineEl = scrollContainer.querySelector('[data-line-id]');
        const lineH = lineEl ? (lineEl as HTMLElement).offsetHeight : (config.fontSize || 18) * 1.5;
        
        // Speed in pixels per second = (line height) / (seconds per line)
        const gap = 8 * config.scale;
        const totalLineStep = lineH + gap;
        const speed = totalLineStep / (config.autoScrollSpeed || 6.0);
        
        // Half of the time-per-line is used as an initial pause delay for the active line,
        // so that the first highlighted line stays active for exactly the full seconds-per-line duration
        const delayLimit = (config.autoScrollSpeed || 6.0) / 2;
        if (playTimeRef.current > delayLimit) {
          preciseScrollTop = startingScrollTop + (playTimeRef.current - delayLimit) * speed;
        } else {
          preciseScrollTop = startingScrollTop;
        }
        
        // Assign directly to browser scrollTop
        scrollContainer.scrollTop = preciseScrollTop;

        // Check if we reached the bottom (only if we have reached the last line of the script)
        const lines = configLinesRef.current;
        const isLastLine = lines.length > 0 && activeLineIdRef.current === lines[lines.length - 1].id;
        const maxScrollTop = scrollContainer.scrollHeight - scrollContainer.clientHeight;
        const isAtBottom = isLastLine && maxScrollTop > 0 && scrollContainer.scrollTop >= maxScrollTop - 4;
        
        if (isAtBottom) {
          if (onPauseAutoScroll) onPauseAutoScroll();
        } else {
          // Update active line highlight based on current scroll center
          updateActiveLineBasedOnScrollPosition(scrollContainer);
        }
      }
      
      previousTimeRef.current = time;
      requestRef.current = requestAnimationFrame(animate);
    };

    previousTimeRef.current = null;
    requestRef.current = requestAnimationFrame(animate);

    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [isAutoScrollPlaying, config.autoScrollSpeed, config.fontSize, config.scale, config.contentMode]);

  // Wheel to zoom (pinch simulation on mouse)
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomIntensity = 0.05;
    const delta = e.deltaY < 0 ? 1 : -1;
    // Limit scale tightly to [0.75, 1.20] so it remains highly legible and fits phone container perfectly
    const newScale = Math.max(0.75, Math.min(1.20, config.scale + delta * zoomIntensity));
    onScaleChange(Number(newScale.toFixed(2)));
  };

  // Base dimensions of the floating cue window (automatically adapts to media ratio)
  const baseWidth = config.contentMode === 'text' 
    ? 280 
    : (mediaRatio ? (mediaRatio >= 1 ? 240 : Math.round(240 * mediaRatio)) : 200);

  const baseHeight = config.contentMode === 'text' 
    ? 180 
    : (mediaRatio ? (mediaRatio >= 1 ? Math.round(240 / mediaRatio) : 240) : 135);

  const currentWidth = baseWidth * config.scale;
  const currentHeight = baseHeight * config.scale;

  // Keep widget inside the viewport if scale or contentMode changes the dimensions
  useEffect(() => {
    const halfWidth = currentWidth / 2;
    const halfHeight = currentHeight / 2;

    const minX = halfWidth;
    const maxX = 350 - halfWidth;
    const minY = halfHeight;
    const maxY = 758 - halfHeight;

    let adjustedX = position.x;
    let adjustedY = position.y;
    let needsAdjustment = false;

    if (position.x < minX) {
      adjustedX = minX;
      needsAdjustment = true;
    } else if (position.x > maxX) {
      adjustedX = maxX;
      needsAdjustment = true;
    }

    if (position.y < minY) {
      adjustedY = minY;
      needsAdjustment = true;
    } else if (position.y > maxY) {
      adjustedY = maxY;
      needsAdjustment = true;
    }

    if (needsAdjustment) {
      onPositionChange({ x: adjustedX, y: adjustedY });
    }
  }, [currentWidth, currentHeight, position.x, position.y, onPositionChange]);

  return (
    <div
      id="floatcue-widget"
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onDoubleClick={handleDoubleClick}
      onWheel={handleWheel}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${currentWidth}px`,
        height: `${currentHeight}px`,
        transform: 'translate(-50%, -50%)',
        touchAction: 'none',
        opacity: (config.opacity !== undefined ? config.opacity : 85) / 100,
      }}
      className={`absolute z-40 flex flex-col rounded-2xl overflow-hidden shadow-2xl transition-all duration-300 select-none cursor-grab active:cursor-grabbing ${
        isDraggingExternal ? 'shadow-white/5 border border-white/30 scale-[1.02]' : 'border border-white/10'
      }`}
    >
      {/* Premium glassmorphic background layer */}
      <div className="absolute inset-0 bg-black/90 backdrop-blur-2xl z-0 pointer-events-none rounded-2xl" />

      {/* Resize Border Zones (Pinch & Resize Handles on Edge) */}
      <div 
        className="absolute left-0 top-3 bottom-3 w-2.5 cursor-ew-resize z-50 interactive-control hover:bg-white/5 active:bg-white/10 transition-all rounded-l-2xl" 
        onPointerDown={(e) => handleResizeStart(e, 'w')}
        title="拖拽边缘缩放浮窗"
      />
      <div 
        className="absolute right-0 top-3 bottom-3 w-2.5 cursor-ew-resize z-50 interactive-control hover:bg-white/5 active:bg-white/10 transition-all rounded-r-2xl" 
        onPointerDown={(e) => handleResizeStart(e, 'e')}
        title="拖拽边缘缩放浮窗"
      />
      <div 
        className="absolute top-0 left-3 right-3 h-2.5 cursor-ns-resize z-50 interactive-control hover:bg-white/5 active:bg-white/10 transition-all rounded-t-2xl" 
        onPointerDown={(e) => handleResizeStart(e, 'n')}
        title="拖拽边缘缩放浮窗"
      />
      <div 
        className="absolute bottom-0 left-3 right-3 h-2.5 cursor-ns-resize z-50 interactive-control hover:bg-white/5 active:bg-white/10 transition-all rounded-b-2xl" 
        onPointerDown={(e) => handleResizeStart(e, 's')}
        title="拖拽边缘缩放浮窗"
      />

      {/* Corner Resize Handles for diagonal resizing */}
      <div 
        className="absolute top-0 left-0 w-4 h-4 cursor-nwse-resize z-50 interactive-control hover:bg-white/10 active:bg-white/20 transition-all rounded-tl-2xl" 
        onPointerDown={(e) => handleResizeStart(e, 'nw')}
      />
      <div 
        className="absolute top-0 right-0 w-4 h-4 cursor-nesw-resize z-50 interactive-control hover:bg-white/10 active:bg-white/20 transition-all rounded-tr-2xl" 
        onPointerDown={(e) => handleResizeStart(e, 'ne')}
      />
      <div 
        className="absolute bottom-0 left-0 w-4 h-4 cursor-nesw-resize z-50 interactive-control hover:bg-white/10 active:bg-white/20 transition-all rounded-bl-2xl" 
        onPointerDown={(e) => handleResizeStart(e, 'sw')}
      />
      <div 
        className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize z-50 interactive-control hover:bg-white/10 active:bg-white/20 transition-all rounded-br-2xl" 
        onPointerDown={(e) => handleResizeStart(e, 'se')}
      />

      {/* Floating Status / Top Bar (reveals on hover or if dragging) */}
      <div className="absolute top-0 inset-x-0 h-8 flex items-center justify-between px-3 z-20 bg-gradient-to-b from-black/50 to-transparent pointer-events-none">
        <div className="flex items-center gap-1.5 pointer-events-auto">
          <Move size={10} className="text-white/40" />
          <span className="text-[9px] font-mono tracking-wider text-white/50 uppercase">
            {config.contentMode === 'text' ? 'PROMPTER' : 'PIP'}
          </span>
        </div>

        {/* Real-time algorithms active labels */}
        <div className="flex items-center gap-1">
          {config.voiceScrolling && config.contentMode === 'text' && (
            <Mic size={9} className="text-sky-400 animate-pulse" />
          )}
          {config.autoScroll && config.contentMode === 'text' && (
            <span className="text-[7px] bg-emerald-500/20 text-emerald-400 px-1 py-0.2 rounded font-mono font-bold animate-pulse">AUTO</span>
          )}
        </div>
      </div>

      {/* Main Content Areas */}
      <div className="relative flex-1 flex flex-col z-10 overflow-hidden pt-7 pb-2 px-3">
        {config.contentMode === 'text' ? (
          /* TEXT PROMPTER MODE */
          <div 
            className="flex-1 relative flex flex-col overflow-hidden rounded-xl"
            onClick={() => {
              if (isAutoScrollPlaying && onPauseAutoScroll) {
                onPauseAutoScroll();
              }
            }}
          >
            <div 
              ref={scrollContainerRef}
              className="flex-1 overflow-y-auto no-scrollbar pr-1 relative"
              style={{ maskImage: 'linear-gradient(to bottom, transparent, white 20%, white 80%, transparent)' }}
            >
              {/* Added spacer to allow centering top/bottom lines dynamically using container height */}
              <div style={{ height: 'calc(50% - 16px)' }} />
              <div className="flex flex-col gap-2">
                {config.lines.map((line) => {
                  const isActive = line.id === activeLineId;
                  return (
                    <div
                      key={line.id}
                      data-line-id={line.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onActiveLineChange && onActiveLineChange(line.id);
                      }}
                      className={`transition-all duration-300 py-1 origin-center cursor-pointer hover:text-white/85 ${
                        isActive 
                          ? 'text-white font-semibold leading-relaxed scale-100 filter drop-shadow-[0_2px_4px_rgba(255,255,255,0.15)]' 
                          : 'text-white/50 text-sm scale-95 leading-normal font-normal'
                      }`}
                      style={{ 
                        fontSize: isActive 
                          ? `${(config.fontSize || 18) * config.scale}px` 
                          : `${(config.fontSize || 18) * 0.78 * config.scale}px`,
                        lineHeight: '1.5'
                      }}
                    >
                      {line.text}
                    </div>
                  );
                })}
              </div>
              <div style={{ height: 'calc(50% - 16px)' }} />
            </div>

            {/* Play Button Overlay */}
            {config.autoScroll && !isAutoScrollPlaying && autoScrollCountdown === null && (
              <div className="absolute inset-0 flex items-center justify-center z-20 bg-black/30 backdrop-blur-[1px] pointer-events-auto">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onStartAutoScroll) onStartAutoScroll();
                  }}
                  type="button"
                  className="interactive-control w-12 h-12 rounded-full bg-white text-black flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-all group duration-300 cursor-pointer"
                  style={{ transform: `scale(${config.scale})` }}
                  title="点击开始计时3秒后自动滚动"
                >
                  <Play size={18} fill="currentColor" className="ml-1 text-black group-hover:text-neutral-800 transition-colors" />
                </button>
              </div>
            )}

            {/* Countdown Overlay */}
            <AnimatePresence>
              {autoScrollCountdown !== null && (
                <motion.div
                  initial={{ opacity: 0, y: -20, x: '-50%' }}
                  animate={{ opacity: 1, y: 0, x: '-50%' }}
                  exit={{ opacity: 0, y: -20, x: '-50%' }}
                  className="absolute top-2 left-1/2 bg-black/95 border border-emerald-500/40 text-emerald-400 px-4 py-1.5 rounded-full flex items-center gap-3 z-30 shadow-[0_4px_25px_rgba(16,185,129,0.35)] pointer-events-none backdrop-blur-xl"
                  style={{ transformOrigin: 'center top', scale: config.scale }}
                >
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  
                  <span className="text-[10px] font-semibold tracking-wider uppercase font-sans text-white/95">
                    准备开始
                  </span>

                  <motion.div
                    key={autoScrollCountdown}
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.5, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 350, damping: 20 }}
                    className="text-emerald-400 font-display font-black text-xs w-6 h-6 flex items-center justify-center bg-emerald-500/20 rounded-full border border-emerald-500/30 shadow-[0_0_8px_rgba(16,185,129,0.2)]"
                  >
                    {autoScrollCountdown}
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ) : config.contentMode === 'image' ? (
          /* PICTURE-IN-PICTURE IMAGE MODE */
          <div className="flex-1 w-full h-full flex items-center justify-center relative overflow-hidden rounded-lg">
            {config.mediaUrl ? (
              <img 
                src={config.mediaUrl} 
                alt="Pip Reference"
                referrerPolicy="no-referrer"
                onLoad={(e) => {
                  const img = e.currentTarget;
                  if (img.naturalWidth && img.naturalHeight) {
                    setMediaRatio(img.naturalWidth / img.naturalHeight);
                  }
                }}
                className="w-full h-full object-cover rounded"
                style={{ opacity: config.opacity / 100 }}
              />
            ) : (
              <div className="text-[10px] text-white/40 font-light text-center flex flex-col items-center gap-1">
                <span>无导入图片</span>
                <span className="text-[8px] text-white/20">双击边缘唤回主面板</span>
              </div>
            )}
          </div>
        ) : (
          /* PICTURE-IN-PICTURE VIDEO MODE */
          <div 
            className="flex-1 w-full h-full flex items-center justify-center relative overflow-hidden rounded-lg cursor-pointer"
            onClick={() => {
              if (isVideoPlaying) {
                if (videoRef.current) {
                  videoRef.current.pause();
                }
                setIsVideoPlaying(false);
              }
            }}
          >
            {config.mediaUrl ? (
              <>
                <video 
                  ref={videoRef}
                  src={config.mediaUrl} 
                  loop 
                  playsInline
                  onLoadedMetadata={(e) => {
                    const video = e.currentTarget;
                    if (video.videoWidth && video.videoHeight) {
                      setMediaRatio(video.videoWidth / video.videoHeight);
                    }
                  }}
                  className="w-full h-full object-cover rounded"
                  style={{ opacity: config.opacity / 100 }}
                />

                {/* Big Play Button Overlay */}
                {!isVideoPlaying && videoCountdown === null && (
                  <div className="absolute inset-0 flex items-center justify-center z-20 bg-black/40 backdrop-blur-[1.5px] pointer-events-auto rounded-lg">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setVideoCountdown(3);
                      }}
                      type="button"
                      className="interactive-control w-12 h-12 rounded-full bg-white text-black flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-all group duration-300 cursor-pointer"
                      style={{ transform: `scale(${config.scale})` }}
                      title="点击开始计时3秒后播放视频"
                    >
                      <Play size={18} fill="currentColor" className="ml-1 text-black group-hover:text-neutral-800 transition-colors" />
                    </button>
                  </div>
                )}

                {/* Video Countdown Overlay */}
                <AnimatePresence>
                  {videoCountdown !== null && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 bg-black/60 backdrop-blur-sm z-30 flex flex-col items-center justify-center pointer-events-auto rounded-lg"
                    >
                      <motion.div
                        key={videoCountdown}
                        initial={{ scale: 0.3, opacity: 0 }}
                        animate={{ scale: 1.2, opacity: 1 }}
                        exit={{ scale: 0.8, opacity: 0 }}
                        transition={{ type: 'spring', damping: 15 }}
                        className="text-white font-display font-bold select-none drop-shadow-[0_0_20px_rgba(255,255,255,0.3)]"
                        style={{ fontSize: `${40 * config.scale}px` }}
                      >
                        {videoCountdown}
                      </motion.div>
                      <span className="text-[9px] text-white/60 font-medium uppercase tracking-[0.2em] mt-2 text-center px-4">
                        准备播放参考视频...
                      </span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            ) : (
              <div className="text-[10px] text-white/40 font-light text-center flex flex-col items-center gap-1">
                <span>无导入视频</span>
                <span className="text-[8px] text-white/20">双击边缘唤回主面板</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Mini Controls Panel Overlay (Shown on Hover / Touch) */}
      <AnimatePresence>
        {showControls && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-1 inset-x-2 bg-black/80 backdrop-blur-md rounded-xl p-1.5 border border-white/10 flex flex-col gap-1 z-30 interactive-control"
          >
            {/* Quick stats & status bar */}
            <div className="flex items-center justify-between text-[8px] text-white/40 px-1 font-mono">
              <div className="flex gap-2">
                <span>SIZE: {Math.round(config.scale * 100)}%</span>
                {config.contentMode === 'text' && <span>FONT: {config.fontSize || 18}px</span>}
                {config.contentMode !== 'text' && <span>OPACITY: {config.opacity}%</span>}
              </div>
              <button 
                onClick={onClose}
                className="text-white/60 hover:text-white transition-colors flex items-center gap-0.5 pointer-events-auto"
                title="返回主面板 (双击浮窗也可以)"
              >
                <span>收起</span>
                <X size={8} />
              </button>
            </div>

              {/* Quick Sliders */}
              <div className="flex flex-col gap-1">
                {config.contentMode === 'text' && (
                  <div className="flex items-center gap-2">
                    <span className="text-[8px] text-white/50 w-8">字号</span>
                    <input
                      type="range"
                      min="12"
                      max="32"
                      step="1"
                      value={config.fontSize || 18}
                      onChange={(e) => onFontSizeChange && onFontSizeChange(parseInt(e.target.value))}
                      className="flex-1 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-white"
                    />
                  </div>
                )}

                {/* Playback Mini Controls for Hover Menu (Video Mode) */}
              {config.contentMode === 'video' && config.mediaUrl && (
                <div className="flex items-center justify-between border-t border-white/5 pt-1 mt-0.5 pointer-events-auto">
                  <span className="text-[8px] text-white/50">视频控制</span>
                  <div className="flex items-center gap-1.5">
                    {isVideoPlaying ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (videoRef.current) {
                            videoRef.current.pause();
                          }
                          setIsVideoPlaying(false);
                        }}
                        type="button"
                        className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 px-1.5 py-0.5 rounded text-[8px] font-mono transition-colors cursor-pointer"
                      >
                        暂停
                      </button>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setVideoCountdown(3);
                        }}
                        type="button"
                        disabled={videoCountdown !== null}
                        className={`px-1.5 py-0.5 rounded text-[8px] font-mono transition-colors cursor-pointer ${
                          videoCountdown !== null
                            ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
                            : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400'
                        }`}
                      >
                        {videoCountdown !== null ? `${videoCountdown}s` : '开始'}
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (videoRef.current) {
                          videoRef.current.pause();
                          videoRef.current.currentTime = 0;
                        }
                        setIsVideoPlaying(false);
                        setVideoCountdown(null);
                      }}
                      type="button"
                      className="bg-white/10 hover:bg-white/20 text-white/80 px-1.5 py-0.5 rounded text-[8px] font-mono transition-colors cursor-pointer"
                    >
                      重置
                    </button>
                  </div>
                </div>
              )}


            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Double Click border helper */}
      <div className="absolute inset-0 border-2 border-transparent hover:border-white/5 rounded-2xl pointer-events-none" />
    </div>
  );
}
