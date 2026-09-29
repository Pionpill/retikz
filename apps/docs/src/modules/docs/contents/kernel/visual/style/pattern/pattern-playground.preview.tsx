import type { IRPatternLineStyle, IRPatternPaint } from '@retikz/core';
import { Layout, Node } from '@retikz/react';

const lineStyleOverrideOf = (value: string): IRPatternLineStyle =>
  value === 'dashed' ? { dashed: true } : value === 'dotted' ? { dotted: true, lineCap: 'round' } : {};

/** 图形参数 */
export type PatternPlaygroundPreviewValues = {
  background: 'transparent' | '#eff6ff' | '#0f172a';
  lineStyle: 'solid' | 'dashed' | 'dotted';
  shape: 'lines' | 'dots' | 'grid';
  lineCap: 'butt' | 'round' | 'square';
  lineCycle: 'uniform' | 'every-five' | 'three-style';
  lineWidth: number;
  size: number;
  gridHorizontalStyle: 'dashed' | 'dotted' | 'inherit';
  gridVerticalStyle: 'dashed' | 'dotted' | 'inherit';
  rotation: number;
  color: string;
};

/** 绘制示例图形 */
export const PatternPlaygroundPreview = (values: PatternPlaygroundPreviewValues) => {
  const background = values.background === 'transparent' ? undefined : values.background;
  const lineStyle =
    values.lineStyle === 'dashed' ? { dashed: true } : values.lineStyle === 'dotted' ? { dotted: true } : {};
  const lineCap = values.shape === 'dots' ? {} : { lineCap: values.lineCap };
  const lineStyleCycle: IRPatternPaint['lineStyleCycle'] =
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
    <Layout viewBox={{ x: -140, y: -95, width: 280, height: 190 }}>
      <Node
        position={[0, 0]}
        shape="rectangle"
        style={{
          fill: {
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
          },
          stroke: values.color,
        }}
        layout={{ minimumSize: { width: 210, height: 125 } }}
      >
        {values.shape}
      </Node>
    </Layout>
  );
};
