import { FlowEntities, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';
import { logicFigureGraphProps } from '@/modules/docs/components/logic-figure';

import { animationPlaybackI18n } from './animation-playback.i18n';

/** 原理图的语言参数 */
export type AnimationPlaybackProps = { lang?: Lang };

/** 展示本节的实际数据依赖与处理分支 */
const AnimationPlayback: FC<AnimationPlaybackProps> = props => {
  const { lang = 'zh' } = props;
  const labels = animationPlaybackI18n[lang];
  const text = (index: number) =>
    labels[index].map((line, row) => ({ text: line, ...(row === 0 ? {} : { fill: 'gray', font: { size: 12 } }) }));
  return (
    <PreviewFlowDiagram
      {...logicFigureGraphProps()}
      flowDefaults={{ entity: { style: { font: { size: 14 } } } }}
      style={{ maxWidth: '100%', height: 'auto' }}
    >
      <FlowLayout id="playback-layout" kind="linear" direction="down">
        <FlowEntities items={[{ id: 'tracks', text: text(0), role: 'resource' }]} />
        <FlowLayout id="paths-layout" kind="linear" direction="right" itemWidth="match-largest">
          <FlowEntities
            items={[
              { id: 'css', text: text(1), role: 'activity' },
              { id: 'waapi', text: text(2), role: 'activity' },
              { id: 'canvas', text: text(3), role: 'activity' },
              { id: 'snapshot', text: text(4), role: 'activity' },
            ]}
          />
        </FlowLayout>
      </FlowLayout>
      <FlowRelations
        items={[
          { source: 'tracks', target: 'css' },
          { source: 'tracks', target: 'waapi' },
          { source: 'tracks', target: 'canvas' },
          { source: 'tracks', target: 'snapshot' },
        ]}
      />
    </PreviewFlowDiagram>
  );
};
export default AnimationPlayback;
