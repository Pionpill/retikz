import { FlowEntities, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';
import { logicFigureGraphProps } from '@/modules/docs/components/logic-figure';

import { resourceI18n } from './pattern-resource.i18n';
/** 资源共享图参数 */
export type PatternResourceProps = { lang?: Lang };
/** 展示两个消费方指向同一个资源 */
const PatternResource: FC<PatternResourceProps> = props => {
  const { lang = 'zh' } = props;
  const text = resourceI18n[lang];
  return (
    <PreviewFlowDiagram
      {...logicFigureGraphProps()}
      layout={{ direction: 'right' }}
      style={{ maxWidth: '100%', height: 'auto' }}
    >
      <FlowLayout id="resource" kind="linear" direction="right">
        <FlowLayout id="consumers" kind="linear" direction="down" itemWidth="match-largest">
          <FlowEntities
            items={[
              { id: 'node', text: text[0], role: 'activity' },
              { id: 'path', text: text[1], role: 'activity' },
            ]}
          />
        </FlowLayout>
        <FlowEntities
          items={[
            { id: 'paint', text: text[2], role: 'activity' },
            { id: 'render', text: text[3], role: 'activity' },
          ]}
        />
      </FlowLayout>
      <FlowRelations
        items={[
          { source: 'node', target: 'paint' },
          { source: 'path', target: 'paint' },
          { source: 'paint', target: 'render' },
        ]}
      />
    </PreviewFlowDiagram>
  );
};
export default PatternResource;
