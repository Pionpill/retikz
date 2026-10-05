import type { IRAnimationTrack } from '@retikz/core';
import { Layout, Node } from '@retikz/react';
import type { FC } from 'react';
import { useState } from 'react';

import type { Lang } from '@/i18n';

import { animationTriggerI18n } from './animation-trigger.i18n';

/** 图形参数 */
export type AnimationTriggerPreviewProps = {
  trigger: 'load' | 'visible' | 'manual' | 'click';
  lang: Lang;
};

const triggers: Record<AnimationTriggerPreviewProps['trigger'], IRAnimationTrack['trigger']> = {
  load: 'load',
  visible: 'visible',
  manual: 'manual',
  click: { onEvent: 'click' },
};

/** 切换触发方式并重播同一图形动画 */
export const AnimationTriggerPreview: FC<AnimationTriggerPreviewProps> = props => {
  const { trigger, lang } = props;
  const text = animationTriggerI18n[lang];
  const [generation, setGeneration] = useState(0);
  const track: IRAnimationTrack = {
    property: 'scale',
    keyframes: [
      { at: 0, value: 1 },
      { at: 0.5, value: 1.6 },
      { at: 1, value: 1 },
    ],
    duration: 1800,
    easing: 'ease-in-out',
    trigger: triggers[trigger],
  };

  return (
    <div className="max-h-full w-full max-w-[360px] space-y-2 overflow-y-auto p-3">
      <p className="text-sm text-muted-foreground">{text.hints[trigger]}</p>
      <div key={`${trigger}-${generation}`} className="h-[180px] overflow-auto rounded-md border" data-trigger-viewport>
        {trigger === 'visible' && <div className="h-screen" />}
        <Layout viewBox={{ x: -130, y: -80, width: 260, height: 160 }}>
          <Node
            id="trigger-target"
            shape="circle"
            position={[0, -15]}
            layout={{ minimumSize: 52 }}
            style={{ fill: 'dodgerblue', fillOpacity: 0.3, stroke: 'dodgerblue' }}
            animations={[track]}
          >
            {text.node}
          </Node>
          {trigger === 'manual' && (
            <Node
              id="start-trigger"
              position={[0, 55]}
              shape="rectangle"
              style={{ fill: 'white', stroke: 'dodgerblue', textColor: 'black' }}
              onClick={(_event, context) => context.animation.restart('trigger-target')}
            >
              {text.start}
            </Node>
          )}
        </Layout>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        <button
          type="button"
          className="rounded-md border px-3 py-1 text-sm"
          onClick={() => setGeneration(value => value + 1)}
        >
          {text.reset}
        </button>
      </div>
    </div>
  );
};
