export type ContentMode = 'text' | 'image' | 'video';

export interface PrompterLine {
  id: string;
  text: string;
}

export interface FloatCueConfig {
  contentMode: ContentMode;
  text: string;
  lines: PrompterLine[];
  mediaUrl: string | null;
  mediaType: 'image' | 'video' | null;
  voiceScrolling: boolean;
  opacity: number; // 0 to 100
  scale: number; // 0.5 to 1.5
  scrollSpeed: number; // For manual auto-scroll, lines per minute
  fontSize: number; // Font size in pixels (e.g. 14 to 32)
  autoScroll?: boolean; // Whether auto-scroll is enabled
  autoScrollSpeed?: number; // Auto-scroll speed in seconds per line
  vocalProgress?: number; // Real-time speaking percentage inside the current sentence (0.0 to 1.0)
}
