import { FlowEntities, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';
import { defineControlledPreview } from '@/modules/docs/preview';

import { createPreviewControlContract, previewControls } from './flow-bounds.controls';
import { flowBoundsI18n } from './flow-bounds.i18n';

export type FlowBoundsProps = Readonly<{ lang?: Lang }>;

export { previewControls };

const viewBox = { x: -112, y: -44, width: 430, height: 210 };

/** 交互视图与源码视图共享同一 Flow 声明 */
const renderFlow = (lang: Lang, excludeFormats: boolean) => {
  const i18n = flowBoundsI18n[lang];
  return (
    <PreviewFlowDiagram routing={{ kind: 'straight' }} viewBox={viewBox}>
      <FlowLayout id="outputs" kind="linear" direction="down" gap={24}>
        <FlowEntities items={[{ id: 'svg', text: i18n.svg, role: 'activity' }]} />
        <FlowLayout
          id="canvas-output"
          kind="linear"
          direction="right"
          gap={32}
          excludeFromBounds={excludeFormats ? ['formats'] : []}
        >
          <FlowEntities items={[{ id: 'canvas', text: i18n.canvas, role: 'activity' }]} />
          <FlowLayout id="formats" kind="linear" direction="down" gap={12}>
            <FlowEntities
              items={[
                { id: 'png', text: 'PNG', role: 'activity' },
                { id: 'jpeg', text: 'JPEG', role: 'activity' },
              ]}
            />
          </FlowLayout>
        </FlowLayout>
      </FlowLayout>
      <FlowRelations items={['png', 'jpeg'].map(target => ({ source: 'canvas', target }))} />
    </PreviewFlowDiagram>
  );
};

const createPreview = (lang: Lang) => {
  const controlled = defineControlledPreview(createPreviewControlContract(lang), values =>
    renderFlow(lang, values.excludeFormats),
  );
  return {
    ...controlled,
    source: { ...controlled.source, canonicalRender: () => renderFlow(lang, true) },
  };
};

const previews = { zh: createPreview('zh'), en: createPreview('en') };

export const previewSource = previews.zh.source;

/** 当前语言的结构边界交互示例 */
const Demo: FC<FlowBoundsProps> = props => {
  const { lang = 'zh' } = props;
  const Preview = previews[lang].Component;
  return <Preview />;
};
export default Demo;
