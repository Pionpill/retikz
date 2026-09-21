import { FlowEntities, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';
import { LogicFigureEntityKind, logicFigureGraphProps } from '@/modules/docs/components/logic-figure';

import { layoutAutoViewportI18n } from './layout-auto-viewport.i18n';

/** 自动视窗流程图的语言 */
export type LayoutAutoViewportProps = Readonly<{ lang?: Lang }>;

/** 保留边界输入、扩展动作和视窗输出，仅强调扩展机制 */
const LayoutAutoViewport: FC<LayoutAutoViewportProps> = props => {
  const { lang = 'zh' } = props;
  const i18n = layoutAutoViewportI18n[lang];
  return (
    <PreviewFlowDiagram
      {...logicFigureGraphProps()}
      flowDefaults={{ entity: { layout: { lineHeight: 16 } } }}
      style={{ maxWidth: '100%', height: 'auto' }}
    >
      <FlowLayout kind="linear" id="layout-auto-viewport" direction="right">
        <FlowEntities
          items={[
            {
              id: 'bounds',
              role: 'state',
              text: [{ text: i18n.bounds }, { text: i18n.boundsNote, fill: 'gray', font: { size: 12 } }],
            },
            {
              id: 'padding',
              role: 'activity',
              kind: LogicFigureEntityKind.Important,
              text: [{ text: i18n.padding }, { text: i18n.paddingNote, fill: 'gray', font: { size: 12 } }],
            },
            {
              id: 'viewport',
              role: 'state',
              text: [{ text: i18n.viewport }, { text: i18n.viewportNote, fill: 'gray', font: { size: 12 } }],
            },
          ]}
        />
      </FlowLayout>
      <FlowRelations
        items={[
          { source: 'bounds', target: 'padding' },
          { source: 'padding', target: 'viewport' },
        ]}
      />
    </PreviewFlowDiagram>
  );
};

export default LayoutAutoViewport;
