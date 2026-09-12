import type { FC } from 'react';

import { FlowEntities, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';

import type { Lang } from '@/i18n';

import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';
import { LogicFigureEntityKind, logicFigureGraphProps } from '@/modules/docs/components/logic-figure';

import { inspectCompileFlowI18n } from './inspect-compile-flow.i18n';

/** 流程图的本地化参数 */
export type InspectCompileFlowFigureProps = Readonly<{ lang?: Lang }>;

/** 展示最终结果如何分为主图与观测支路，再汇入同一次显示 */
export const InspectCompileFlowFigure: FC<InspectCompileFlowFigureProps> = props => {
  const { lang = 'zh' } = props;
  const i18n = inspectCompileFlowI18n[lang];
  return (
    <PreviewFlowDiagram {...logicFigureGraphProps(false)} layout={{ nodeGap: 24 }}>
      <FlowLayout kind="linear" id="flow" direction="down" align="center">
        <FlowLayout kind="linear" id="authoring" direction="down" align="center">
          <FlowEntities
            items={[
              { id: 'input', text: i18n.input, role: 'activity', kind: LogicFigureEntityKind.Secondary },
              { id: 'compile', text: i18n.compile, role: 'activity', kind: LogicFigureEntityKind.Secondary },
            ]}
          />
        </FlowLayout>
        <FlowLayout kind="linear" id="branches" gap={96} direction="right" align="center">
          <FlowEntities
            items={[
              {
                id: 'primary',
                text: i18n.primary,
                role: 'activity',
                kind: LogicFigureEntityKind.Secondary,
                group: 'primary',
              },
            ]}
          />
          <FlowLayout gap={24} kind="linear" id="auxiliary" direction="down" align="center">
            <FlowEntities
              items={[
                {
                  id: 'observation',
                  text: i18n.observation,
                  role: 'activity',
                  kind: LogicFigureEntityKind.Secondary,
                  group: 'inspection',
                },
                {
                  id: 'inspect',
                  text: i18n.inspect,
                  role: 'activity',
                  kind: LogicFigureEntityKind.Secondary,
                  group: 'inspection',
                },
                {
                  id: 'fragment',
                  text: i18n.fragment,
                  role: 'activity',
                  kind: LogicFigureEntityKind.Secondary,
                  group: 'inspection',
                },
              ]}
            />
          </FlowLayout>
        </FlowLayout>
        <FlowEntities
          items={[{ id: 'render', text: i18n.render, role: 'activity', kind: LogicFigureEntityKind.Secondary }]}
        />
      </FlowLayout>
      <FlowRelations
        items={[
          { source: 'input', target: 'compile' },
          { source: 'compile', target: 'primary', group: 'primary', routing: { kind: '-|', cornerRadius: 4 } },
          {
            source: 'compile',
            target: 'observation',
            group: 'inspection',
            routing: { kind: '-|', cornerRadius: 4 },
          },
          { source: 'observation', target: 'inspect', group: 'inspection' },
          { source: 'inspect', target: 'fragment', group: 'inspection' },
          { source: 'primary', target: 'render', group: 'primary', routing: { kind: '|-', cornerRadius: 4 } },
          {
            source: 'fragment',
            target: 'render',
            group: 'inspection',
            routing: { kind: '|-', cornerRadius: 4 },
          },
        ]}
      />
    </PreviewFlowDiagram>
  );
};

export default InspectCompileFlowFigure;
