import { PrompterLine } from './types';

export const DEFAULT_SCRIPT_LINES: PrompterLine[] = [
  { id: '1', text: '这是一款专为拍摄场景设计的浮窗提示工具，主要包含两大功能模块。' },
  { id: '2', text: '1. 字幕提示：支持两种滚动模式。' },
  { id: '3', text: '语音同步滚动会实时识别你的语速，自动匹配翻行节奏，说得快就滚得快，说得慢就滚得慢，全程解放双手不用管；' },
  { id: '4', text: '自动匀速滚动则可以自由设置滚动速度，按自己习惯的节奏走。' },
  { id: '5', text: '2. 画中画参考：支持放视频或图片做参考浮窗，' },
  { id: '6', text: '无论是对着教程学手势舞、跳舞卡点，还是想模仿某个拍照姿势和运镜角度，' },
  { id: '7', text: '都可以一边看参考一边拍，不用来回切换软件。' },
  { id: '8', text: '两大功能的浮窗都支持调整透明度，可以根据拍摄环境和取景需要自由调节，' },
  { id: '9', text: '既能看清参考内容，又不会挡住画面。' }
];

export const PRESET_IMAGES = [
  {
    id: 'pose-1',
    name: '对称构图人像 (Portrait Symmetry)',
    url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&auto=format&fit=crop&q=80',
    description: '用于练习端正口播仪态、微表情与情绪管理'
  },
  {
    id: 'pose-2',
    name: '侧身黄金三角 (Diagonal Composition)',
    url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&auto=format&fit=crop&q=80',
    description: '适合时尚、穿搭博主进行身形定位与视觉对比'
  },
  {
    id: 'grid-gold',
    name: '黄金九宫格 (Composition Helper)',
    url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80', // Beautiful abstract grid structure
    description: '辅助主播精准锁定双眼在屏幕上三分之一的黄金位置'
  }
];

export const PRESET_VIDEOS = [
  {
    id: 'dance-1',
    name: '时尚卡点参考 (Vibe Loop Reference)',
    url: 'https://assets.mixkit.co/videos/preview/mixkit-girl-in-neon-sign-dancing-40093-large.mp4',
    description: '无限循环播放，方便您在镜头前实时校对律动与舞蹈节拍'
  },
  {
    id: 'vlog-1',
    name: '口播主播示范 (Vlog Presentation Style)',
    url: 'https://assets.mixkit.co/videos/preview/mixkit-man-holding-smartphone-having-video-call-40012-large.mp4',
    description: '用于博主对齐语气词、呼吸气口及肢体语言表达'
  }
];
