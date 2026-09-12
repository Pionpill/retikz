import type { FC } from 'react';

import type { Lang } from '@/i18n';

import { FlowEntities, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';

import { PreviewFlowDiagram as FlowDiagram } from '@/modules/docs/components/component-preview/theme';

import { texReactLifecycleI18n } from './tex-react-lifecycle.i18n';
import { LogicFigureEntityKind, logicFigureGraphProps } from '@/modules/docs/components/logic-figure';

/** 展示 useLowerTex 的 React hook 生命周期 */
export type TexReactLifecycleI18nFigureProps = Readonly<{ lang?: Lang }>;

const Demo: FC<TexReactLifecycleI18nFigureProps> = props => {
  const { lang = 'zh' } = props;
  const i18n = texReactLifecycleI18n[lang];

  return (
    <FlowDiagram {...logicFigureGraphProps()} layout={{ direction: 'down' }}>
      <FlowLayout kind="linear" id="lifecycle" direction="down" align="center" gap={28}>
        <FlowLayout kind="linear" id="configuration-row" direction="right" align="center" gap={36}>
          <FlowEntities
            items={[
              {
                id: 'configuration-change',
                text: i18n.label1,
                role: 'activity',
                kind: LogicFigureEntityKind.Important,
              },
              { id: 'clear-lowerer', text: i18n.label2, role: 'activity' },
              { id: 'stale-result', text: i18n.label3, role: 'state' },
            ]}
          />
        </FlowLayout>
        <FlowLayout kind="linear" id="failure-row" direction="right" align="center" gap={36}>
          <FlowEntities
            items={[
              { id: 'initialization-failure', text: i18n.label4, role: 'activity' },
              { id: 'remove-failed-entry', text: i18n.label5, role: 'activity' },
              { id: 'retry-mount', text: i18n.label6, role: 'state' },
            ]}
          />
        </FlowLayout>
      </FlowLayout>

      <FlowRelations
        items={[
          { source: 'configuration-change', target: 'clear-lowerer' },
          { source: 'clear-lowerer', target: 'stale-result' },
          { source: 'initialization-failure', target: 'remove-failed-entry' },
          { source: 'remove-failed-entry', target: 'retry-mount' },
        ]}
      />
    </FlowDiagram>
  );
};

export default Demo;
