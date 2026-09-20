import type { IRAnimationTrack } from '@retikz/core';
import { Layout, Node } from '@retikz/react';
import type { FC } from 'react';
import { useState } from 'react';

import type { Lang } from '@/i18n';
import type { PreviewSourceConfig } from '@/modules/docs/preview';
import { usePreviewControls } from '@/modules/docs/preview';

import { createAnimationTriggerControls } from './animation-trigger.controls';
import { animationTriggerI18n } from './animation-trigger.i18n';

/** 触发器示例的语言参数 */
export type AnimationTriggerProps = { lang?: Lang };

export const previewControls = createAnimationTriggerControls('zh');
export const previewSource = { deriveIR: false } satisfies PreviewSourceConfig;

const triggers: Record<string, IRAnimationTrack['trigger']> = {
  load: 'load',
  visible: 'visible',
  manual: 'manual',
  click: { onEvent: 'click' },
};

/** Switch triggers without changing the animated geometry */
const AnimationTrigger: FC<AnimationTriggerProps> = props => {
  const { lang = 'zh' } = props;
  const text = animationTriggerI18n[lang];
  const values = usePreviewControls(createAnimationTriggerControls(lang));
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
    trigger: triggers[values.trigger],
  };
  return (
    <div className="max-h-full w-full max-w-[360px] space-y-2 overflow-y-auto p-3">
      <p className="text-sm text-muted-foreground">{text.hints[values.trigger]}</p>
      <div
        key={`${values.trigger}-${generation}`}
        className="h-[180px] overflow-auto rounded-md border"
        data-trigger-viewport
      >
        {values.trigger === 'visible' && <div className="h-screen" />}
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
          {values.trigger === 'manual' && (
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

export default AnimationTrigger;
