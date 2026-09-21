import { FlowEntities, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';
import { LogicFigureEntityKind, logicFigureGraphProps } from '@/modules/docs/components/logic-figure';

import { layoutViewboxResolutionI18n } from './layout-viewbox-resolution.i18n';

/** 显示尺寸推导流程图的语言 */
export type LayoutViewboxResolutionProps = Readonly<{ lang?: Lang }>;

/** 将比例计算排成主链，数值宽度从下方接入高度计算 */
const LayoutViewboxResolution: FC<LayoutViewboxResolutionProps> = props => {
  const { lang = 'zh' } = props;
  const i18n = layoutViewboxResolutionI18n[lang];
  return (
    <PreviewFlowDiagram
      {...logicFigureGraphProps()}
      flowDefaults={{ entity: { layout: { lineHeight: 16 } } }}
      style={{ maxWidth: '100%', height: 'auto' }}
    >
      <FlowLayout
        kind="grid"
        id="viewport"
        placements={[
          ['selection', 'range', 'display'],
          [null, null, 'sizing'],
        ]}
      >
        <FlowEntities
          items={[
            {
              id: 'selection',
              role: 'state',
              text: [{ text: i18n.select }, { text: i18n.priority, fill: 'gray', font: { size: 12 } }],
            },
            {
              id: 'range',
              role: 'activity',
              text: [{ text: i18n.range }, { text: i18n.automatic, fill: 'gray', font: { size: 12 } }],
            },
            {
              id: 'sizing',
              role: 'state',
              text: [{ text: i18n.size }, { text: i18n.sizing, fill: 'gray', font: { size: 12 } }],
            },
            {
              id: 'display',
              role: 'activity',
              kind: LogicFigureEntityKind.Important,
              text: [{ text: i18n.display }, { text: i18n.independent, fill: 'gray', font: { size: 12 } }],
            },
          ]}
        />
      </FlowLayout>
      <FlowRelations
        items={[
          { source: 'selection', target: 'range' },
          { source: 'range', target: 'display' },
          { source: 'sizing', target: 'display' },
        ]}
      />
    </PreviewFlowDiagram>
  );
};

export default LayoutViewboxResolution;
