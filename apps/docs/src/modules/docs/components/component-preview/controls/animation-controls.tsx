import { Pause, Play, RotateCcw, Square } from 'lucide-react';

import type { PreviewControlSlot } from '../types';

import { PreviewToolbar, PreviewToolbarButton } from '../components/PreviewToolbar';

export const ANIMATION_PAUSED_CONTROL_ID = 'animation-paused';

const paneAnimations = (pane: HTMLElement | null): Array<Animation> =>
  pane ? pane.getAnimations({ subtree: true }) : [];

/** 构建内置动画控制插槽。 */
export const buildAnimationControlSlots = (isPaused: boolean): Array<PreviewControlSlot> => [
  {
    id: 'animation-controls',
    placement: 'top-start',
    render: runtime => (
      <PreviewToolbar>
        <PreviewToolbarButton
          label="Replay"
          onClick={() => {
            runtime.setActive(ANIMATION_PAUSED_CONTROL_ID, false);
            runtime.remount();
          }}
        >
          <RotateCcw className="size-3.5" />
        </PreviewToolbarButton>
        <PreviewToolbarButton
          label={isPaused ? 'Play' : 'Pause'}
          pressed={isPaused}
          onClick={() => {
            const animations = paneAnimations(runtime.renderPane);
            if (runtime.active(ANIMATION_PAUSED_CONTROL_ID)) {
              animations.forEach(animation => animation.play());
              runtime.setActive(ANIMATION_PAUSED_CONTROL_ID, false);
              return;
            }
            animations.forEach(animation => animation.pause());
            runtime.setActive(ANIMATION_PAUSED_CONTROL_ID, true);
          }}
        >
          {isPaused ? <Play className="size-3.5" /> : <Pause className="size-3.5" />}
        </PreviewToolbarButton>
        <PreviewToolbarButton
          label="Stop"
          onClick={() => {
            paneAnimations(runtime.renderPane).forEach(animation => animation.cancel());
            runtime.setActive(ANIMATION_PAUSED_CONTROL_ID, false);
          }}
        >
          <Square className="size-3.5" />
        </PreviewToolbarButton>
      </PreviewToolbar>
    ),
  },
];
