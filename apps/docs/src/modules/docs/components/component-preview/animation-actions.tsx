import { Pause, Play, RotateCcw, Square } from 'lucide-react';

import type { PreviewAction } from './_shared';

/** 播放/暂停工具的 toolState key（ComponentRender 据它取暂停态选图标） */
export const ANIM_PAUSE_ID = 'anim-paused';

/** 取渲染区内全部动画（CSS @keyframes + WAAPI，含 subtree）；空 pane 返回空 */
const paneAnimations = (pane: HTMLElement | null): Array<Animation> =>
  pane ? pane.getAnimations({ subtree: true }) : [];

/**
 * 动画内置工具：重播 / 播放·暂停 / 停止（IR 含 animations 的卡自动装配）
 * @description 重播 = remount（renderer 无关、从头）；播放·暂停 / 停止经 `getAnimations` 控 CSS + WAAPI
 *   （SVG 模式有效；Canvas rAF 时钟在 demo 内部、文档壳够不到，故 Canvas 模式这两键退化无效、重播仍可用）。
 * @param isPaused 当前暂停态（决定播放/暂停按钮的图标与高亮）
 */
export const buildAnimationActions = (isPaused: boolean): Array<PreviewAction> => [
  {
    id: 'anim-replay',
    label: 'Replay',
    icon: <RotateCcw className="size-3.5" />,
    onClick: ctx => {
      ctx.setActive(ANIM_PAUSE_ID, false);
      ctx.replay();
    },
  },
  {
    id: 'anim-playpause',
    label: isPaused ? 'Play' : 'Pause',
    active: isPaused,
    icon: isPaused ? <Play className="size-3.5" /> : <Pause className="size-3.5" />,
    onClick: ctx => {
      const animations = paneAnimations(ctx.renderPane);
      if (ctx.active(ANIM_PAUSE_ID)) {
        animations.forEach(a => a.play());
        ctx.setActive(ANIM_PAUSE_ID, false);
      } else {
        animations.forEach(a => a.pause());
        ctx.setActive(ANIM_PAUSE_ID, true);
      }
    },
  },
  {
    id: 'anim-stop',
    label: 'Stop',
    icon: <Square className="size-3.5" />,
    onClick: ctx => {
      // cancel 把元素恢复到无动画的 base = settled 终态（intro 末帧 / 循环回静止值）
      paneAnimations(ctx.renderPane).forEach(a => a.cancel());
      ctx.setActive(ANIM_PAUSE_ID, false);
    },
  },
];
