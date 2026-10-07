import { FlowEntities, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';
import { logicFigureGraphProps } from '@/modules/docs/components/logic-figure';

import { computationOutcomesI18n } from './computation-outcomes.i18n';

/** 主题关系图的语言配置 */
export type ComputationOutcomesProps = Readonly<{ lang?: Lang }>;
/** 展示本主题的输入、处理规则与读取用途 */
const ComputationOutcomes: FC<ComputationOutcomesProps> = props => {
  const { lang = 'zh' } = props;
  const text = computationOutcomesI18n[lang];
  return (
    <PreviewFlowDiagram {...logicFigureGraphProps()} style={{ maxWidth: '100%', height: 'auto' }}>
      <FlowLayout id="computation-outcomes" kind="linear" direction="right" align="center">
        <FlowLayout id="column-0" kind="linear" direction="down" itemWidth="match-largest">
          <FlowEntities items={[{ id: 'update', text: text.update, role: 'activity' }]} />
        </FlowLayout>
        <FlowLayout id="column-1" kind="linear" direction="down" itemWidth="match-largest">
          <FlowEntities
            items={[
              { id: 'incremental', text: text.incremental, role: 'state' },
              { id: 'bailout', text: text.bailout, role: 'state' },
              { id: 'fallback', text: text.fallback, role: 'state' },
            ]}
          />
        </FlowLayout>
        <FlowLayout id="column-2" kind="linear" direction="down" itemWidth="match-largest">
          <FlowEntities
            items={[
              { id: 'result', text: text.result, role: 'state' },
              { id: 'reuse', text: text.reuse, role: 'activity' },
              { id: 'run', text: text.run, role: 'activity' },
            ]}
          />
        </FlowLayout>
        <FlowLayout id="column-3" kind="linear" direction="down">
          <FlowEntities items={[{ id: 'capture', text: text.capture, role: 'activity' }]} />
        </FlowLayout>
      </FlowLayout>
      <FlowRelations
        items={[
          { source: 'update', target: 'incremental' },
          { source: 'update', target: 'bailout' },
          { source: 'update', target: 'fallback' },
          { source: 'incremental', target: 'result' },
          { source: 'bailout', target: 'reuse' },
          { source: 'fallback', target: 'run' },
          { source: 'result', target: 'capture' },
          { source: 'run', target: 'capture' },
        ]}
      />
    </PreviewFlowDiagram>
  );
};
export default ComputationOutcomes;
