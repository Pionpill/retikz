import { FlowEntities, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';
import { defineControlledPreview } from '@/modules/docs/preview';

import { createPreviewControlContract, previewControls } from './flow-grid.controls';
import { flowGridI18n } from './flow-grid.i18n';

export { previewControls };

const createPreview = (lang: Lang) =>
  defineControlledPreview(createPreviewControlContract(lang), values => {
    const copy = flowGridI18n[lang];
    return (
      <PreviewFlowDiagram viewBox={{ x: -60, y: -16, width: 360, height: 208 }}>
        <FlowLayout
          kind="grid"
          id="stages"
          placements={[
            ['request', 'cache'],
            ['parse', 'result'],
          ]}
          gap={{ row: values.row, column: values.column }}
          reserveLabelSpace={values.reserveLabelSpace}
        >
          <FlowEntities
            items={[
              { id: 'request', text: copy.request },
              { id: 'cache', text: copy.cache },
              { id: 'parse', text: copy.parse },
              { id: 'result', text: copy.result },
            ]}
          />
        </FlowLayout>
        <FlowRelations items={[{ source: 'request', target: 'cache', label: copy.read }]} />
      </PreviewFlowDiagram>
    );
  });

const previews = { zh: createPreview('zh'), en: createPreview('en') };

export const previewSource = previews.zh.source;

/** Grid 排列示例语言 */
export type FlowGridProps = Readonly<{ lang?: Lang }>;

/** Grid 排列交互示例 */
const Demo: FC<FlowGridProps> = props => {
  const { lang = 'zh' } = props;
  const Preview = previews[lang].Component;
  return <Preview />;
};
export default Demo;
