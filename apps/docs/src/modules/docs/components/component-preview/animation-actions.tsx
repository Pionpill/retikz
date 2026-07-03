import { Pause, Play, RotateCcw, Square } from 'lucide-react';

import type { PreviewAction } from './types';

export const ANIM_PAUSE_ID = 'anim-paused';

const paneAnimations = (pane: HTMLElement | null): Array<Animation> =>
  pane ? pane.getAnimations({ subtree: true }) : [];

/** 构建内置动画工具。 */
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
      paneAnimations(ctx.renderPane).forEach(a => a.cancel());
      ctx.setActive(ANIM_PAUSE_ID, false);
    },
  },
];
