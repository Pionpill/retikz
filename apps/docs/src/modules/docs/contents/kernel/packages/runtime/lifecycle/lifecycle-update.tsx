import { FlowEntities, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';
import { logicFigureGraphProps } from '@/modules/docs/components/logic-figure';

import { lifecycleUpdateI18n } from './lifecycle-update.i18n';

/** 生命周期图的语言 */
export type LifecycleUpdateProps = Readonly<{ lang?: Lang }>;
/** 展示1. 检查版本与命令及相关状态变化 */
const LifecycleUpdate: FC<LifecycleUpdateProps> = props => {
  const { lang = 'zh' } = props;
  const text = lifecycleUpdateI18n[lang];
  return (
    <PreviewFlowDiagram {...logicFigureGraphProps()} style={{ maxWidth: '100%', height: 'auto' }}>
      <FlowLayout id="lifecycle-update" kind="linear" direction="down" align="center" containerWidth="match-largest">
        <FlowLayout id="lifecycle-update-row-0" kind="linear" direction="right" align="center" itemWidth="fill">
          <FlowEntities
            items={[
              { id: 'lifecycle-update-0', text: text.n0, role: 'activity' },
              { id: 'lifecycle-update-1', text: text.n1, role: 'activity' },
              { id: 'lifecycle-update-2', text: text.n2, role: 'activity' },
            ]}
          />
        </FlowLayout>
        <FlowLayout id="lifecycle-update-row-1" kind="linear" direction="right" align="center" itemWidth="fill">
          <FlowEntities
            items={[
              { id: 'lifecycle-update-3', text: text.n3, role: 'activity' },
              { id: 'lifecycle-update-4', text: text.n4, role: 'state', kind: 'docs.logic.importantData' },
              { id: 'lifecycle-update-5', text: text.n5, role: 'activity' },
            ]}
          />
        </FlowLayout>
      </FlowLayout>
      <FlowRelations
        items={[
          { source: 'lifecycle-update-0', target: 'lifecycle-update-1' },
          { source: 'lifecycle-update-1', target: 'lifecycle-update-2' },
          { source: 'lifecycle-update-2', target: 'lifecycle-update-3', routing: { kind: 'orthogonal' } },
          { source: 'lifecycle-update-3', target: 'lifecycle-update-4' },
          { source: 'lifecycle-update-4', target: 'lifecycle-update-5' },
        ]}
      />
    </PreviewFlowDiagram>
  );
};
export default LifecycleUpdate;
