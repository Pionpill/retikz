import { FlowEntities, FlowLayout } from '@retikz/diagram-react/flow';
import type { ReactElement } from 'react';

import type { Lang } from '@/i18n';
import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';
import type { PreviewControlValuesFor } from '@/modules/docs/preview';

import type { previewControls } from './flow-item-width.controls';
import { flowItemWidthI18n } from './flow-item-width.i18n';

/** 按排列方向与 itemWidth 模式渲染同一组直接 Entity */
export const renderFlowItemWidthPreview = (
  values: PreviewControlValuesFor<typeof previewControls>,
  lang: Lang,
): ReactElement => {
  const copy = flowItemWidthI18n[lang];
  const itemWidth =
    values.widthMode === 'natural' ? undefined : values.widthMode === 'match-largest' ? 'match-largest' : values.width;
  const direction = values.direction === 'right' ? 'right' : 'down';
  return (
    <PreviewFlowDiagram
      viewBox={
        direction === 'right'
          ? { x: -60, y: -40, width: 520, height: 160 }
          : { x: -55, y: -18, width: 320, height: 160 }
      }
    >
      <FlowLayout
        kind="linear"
        id="steps"
        direction={direction}
        align="start"
        gap={20}
        {...(itemWidth === undefined ? {} : { itemWidth })}
      >
        <FlowEntities
          items={[
            { id: 'input', text: copy.input, role: 'activity' },
            { id: 'output', text: copy.output, role: 'activity' },
          ]}
        />
      </FlowLayout>
    </PreviewFlowDiagram>
  );
};
