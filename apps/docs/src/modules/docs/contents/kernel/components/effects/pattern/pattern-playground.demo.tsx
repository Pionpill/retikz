import type { IRPatternLineStyle, IRPatternPaintSpec } from '@retikz/core';
import type { FC } from 'react';

import { Layout, Node } from '@retikz/react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { patternPlaygroundControls, previewControlContract } from './pattern-playground.controls';

export const previewControls = patternPlaygroundControls;

/** playground 选择值转为可继承的 Pattern 线型覆盖 */
const lineStyleOverrideOf = (value: string): IRPatternLineStyle =>
  value === 'dashed' ? { dashed: true } : value === 'dotted' ? { dotted: true, lineCap: 'round' } : {};

const controlledPreview = defineControlledPreview(previewControlContract, values => {
  const background = values.background === 'transparent' ? undefined : values.background;
  const lineStyle =
    values.lineStyle === 'dashed' ? { dashed: true } : values.lineStyle === 'dotted' ? { dotted: true } : {};
  const lineCap = values.shape === 'dots' ? {} : { lineCap: values.lineCap };
  const lineStyleCycle: IRPatternPaintSpec['lineStyleCycle'] =
    values.shape !== 'lines' || values.lineCycle === 'uniform'
      ? undefined
      : values.lineCycle === 'every-five'
        ? {
            period: 5,
            overrides: [{ index: 0, style: { lineWidth: values.lineWidth * 2.5 } }],
          }
        : {
            period: 3,
            overrides: [
              { index: 1, style: { dotted: true, lineCap: 'round' } },
              { index: 2, style: { dashed: true } },
            ],
          };

  return (
    <Layout width={280} height={190} viewBox={{ x: -140, y: -95, width: 280, height: 190 }}>
      <Node
        position={[0, 0]}
        shape="rectangle"
        minimumSize={{ width: 210, height: 125 }}
        fill={{
          kind: 'pattern',
          shape: values.shape,
          size: values.size,
          lineWidth: values.lineWidth,
          ...lineStyle,
          ...lineCap,
          ...(values.shape === 'grid'
            ? {
                horizontalStyle: lineStyleOverrideOf(values.gridHorizontalStyle),
                verticalStyle: lineStyleOverrideOf(values.gridVerticalStyle),
              }
            : {}),
          ...(lineStyleCycle === undefined ? {} : { lineStyleCycle }),
          rotation: values.rotation,
          color: values.color,
          ...(background === undefined ? {} : { background }),
        }}
        stroke={values.color}
      >
        {values.shape}
      </Node>
    </Layout>
  );
});

export const previewSource = controlledPreview.source;

/** 固定图元和取景，只让 pattern 规格变化 */
const Demo: FC = controlledPreview.Component;

export default Demo;
