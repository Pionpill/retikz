import type { CompileResult } from '@retikz/core';
import { FlowEntities, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';
import type { BoundsRect } from '@retikz/math';
import type { FC } from 'react';
import { useCallback, useState } from 'react';

import type { Lang } from '@/i18n';
import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';
import { defineControlledPreview } from '@/modules/docs/preview';

import { createPreviewControlContract, previewControls } from './flow-bounds.controls';
import { flowBoundsI18n } from './flow-bounds.i18n';

export type FlowBoundsProps = Readonly<{ lang?: Lang }>;

export { previewControls };

const viewBox = { x: -112, y: -44, width: 430, height: 210 };
const framePadding = 8;

type BoundsSceneProps = Readonly<{ lang: Lang; excludeFormats: boolean }>;

/** 交互视图与源码视图共享同一 Flow 声明 */
const renderFlow = (lang: Lang, excludeFormats: boolean, onCompileResult?: (result: CompileResult) => void) => {
  const i18n = flowBoundsI18n[lang];
  return (
    <PreviewFlowDiagram routing={{ kind: 'straight' }} viewBox={viewBox} onCompileResult={onCompileResult}>
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

/** 用当前编译的空间记录标出 Layout 向父级报告的占位边界 */
const BoundsScene: FC<BoundsSceneProps> = props => {
  const { lang, excludeFormats } = props;
  const [bounds, setBounds] = useState<Readonly<BoundsRect>>();
  const handleCompileResult = useCallback((result: CompileResult) => {
    const nextBounds = result.spatialHandles.entries.find(
      handle =>
        handle.id === 'element:canvas-output' &&
        handle.ownerPath.at(-1)?.namespace === 'diagram' &&
        handle.ownerPath.at(-1)?.type === 'flow',
    )?.geometry.bounds;
    setBounds(current =>
      current?.x === nextBounds?.x &&
      current?.y === nextBounds?.y &&
      current?.width === nextBounds?.width &&
      current?.height === nextBounds?.height
        ? current
        : nextBounds,
    );
  }, []);
  return (
    <div className="relative inline-block align-top">
      {renderFlow(lang, excludeFormats, handleCompileResult)}
      {bounds !== undefined && (
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
          viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
        >
          <rect
            x={bounds.x - framePadding}
            y={bounds.y - framePadding}
            width={bounds.width + framePadding * 2}
            height={bounds.height + framePadding * 2}
            fill="none"
            stroke="gray"
            strokeDasharray="6 4"
            strokeOpacity={0.85}
          />
        </svg>
      )}
    </div>
  );
};

const createPreview = (lang: Lang) => {
  const controlled = defineControlledPreview(createPreviewControlContract(lang), values => (
    <BoundsScene lang={lang} excludeFormats={values.excludeFormats} />
  ));
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
