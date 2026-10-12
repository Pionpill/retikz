import { FlowEntities, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';
import { logicFigureGraphProps, logicFigureRelationKinds } from '@/modules/docs/components/logic-figure';

import { computationChainI18n } from './computation-chain.i18n';

/** 变换链示意图语言参数 */
export type DemoProps = { lang?: Lang };

/** 从左到右展示多个变换的整链校验与两种结果 */
const Demo: FC<DemoProps> = props => {
  const { lang = 'zh' } = props;
  const text = computationChainI18n[lang];
  return (
    <PreviewFlowDiagram {...logicFigureGraphProps()} relationKinds={logicFigureRelationKinds}>
      <FlowLayout id="validation" kind="linear" direction="right" align="center">
        <FlowLayout id="transforms" kind="linear" direction="down" itemWidth="match-largest">
          <FlowEntities
            items={[
              { id: 'transform-1', text: 'transform 1', role: 'activity' },
              { id: 'transform-2', text: 'transform 2', role: 'activity' },
              { id: 'transform-n', text: 'transform n', role: 'activity' },
            ]}
          />
        </FlowLayout>
        <FlowEntities
          items={[
            {
              id: 'check',
              role: 'activity',
              text: [{ text: text.check }, { text: text.detail, fill: 'gray', font: { size: 12 } }],
            },
          ]}
        />
        <FlowLayout id="outcomes" kind="linear" direction="down" itemWidth="match-largest">
          <FlowEntities
            items={[
              { id: 'pass', text: text.pass, role: 'activity', status: 'success' },
              { id: 'error', text: text.error, role: 'activity', status: 'error' },
            ]}
          />
        </FlowLayout>
      </FlowLayout>
      <FlowRelations
        items={[
          { source: 'transform-1', target: 'check' },
          { source: 'transform-2', target: 'check' },
          { source: 'transform-n', target: 'check' },
          { source: 'check', target: 'pass', label: text.valid },
          { source: 'check', target: 'error', label: text.invalid },
        ]}
      />
    </PreviewFlowDiagram>
  );
};

export default Demo;
