import { FlowEntities, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';
import { logicFigureGraphProps } from '@/modules/docs/components/logic-figure';

import { lifecycleFailureI18n } from './lifecycle-failure.i18n';

/** 生命周期图的语言 */
export type LifecycleFailureProps = Readonly<{ lang?: Lang }>;
/** 展示准备 / commit / read 失败及相关状态变化 */
const LifecycleFailure: FC<LifecycleFailureProps> = props => {
  const { lang = 'zh' } = props;
  const text = lifecycleFailureI18n[lang];
  return (
    <PreviewFlowDiagram {...logicFigureGraphProps()} style={{ maxWidth: '100%', height: 'auto' }}>
      <FlowLayout id="lifecycle-failure" kind="linear" direction="down" align="center" containerWidth="match-largest">
        <FlowLayout id="lifecycle-failure-row-0" kind="linear" direction="right" align="center" itemWidth="fill">
          <FlowEntities
            items={[
              { id: 'lifecycle-failure-0', text: text.n0, role: 'activity' },
              { id: 'lifecycle-failure-1', text: text.n1, role: 'state', kind: 'docs.logic.importantData' },
            ]}
          />
        </FlowLayout>
        <FlowLayout id="lifecycle-failure-row-1" kind="linear" direction="right" align="center" itemWidth="fill">
          <FlowEntities
            items={[
              { id: 'lifecycle-failure-2', text: text.n2, role: 'activity' },
              { id: 'lifecycle-failure-3', text: text.n3, role: 'state', kind: 'docs.logic.importantData' },
            ]}
          />
        </FlowLayout>
        <FlowLayout id="lifecycle-failure-row-2" kind="linear" direction="right" align="center" itemWidth="fill">
          <FlowEntities
            items={[
              { id: 'lifecycle-failure-4', text: text.n4, role: 'activity' },
              { id: 'lifecycle-failure-5', text: text.n5, role: 'state', kind: 'docs.logic.importantData' },
            ]}
          />
        </FlowLayout>
      </FlowLayout>
      <FlowRelations
        items={[
          { source: 'lifecycle-failure-0', target: 'lifecycle-failure-1' },
          { source: 'lifecycle-failure-2', target: 'lifecycle-failure-3' },
          { source: 'lifecycle-failure-4', target: 'lifecycle-failure-5' },
        ]}
      />
    </PreviewFlowDiagram>
  );
};
export default LifecycleFailure;
