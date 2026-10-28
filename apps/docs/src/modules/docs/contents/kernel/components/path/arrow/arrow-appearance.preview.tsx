import { diamondArrowDefinition, openDiamondArrowDefinition } from '@retikz/extension';
import { Draw, Layout, Node } from '@retikz/react';

/** 图形参数 */
export type ArrowAppearancePreviewValues = {
  direction: '<->' | 'none' | '->' | '<-';
  shape: 'stealth' | 'normal' | 'open' | 'openStealth' | 'diamond' | 'openDiamond' | 'circle' | 'openCircle';
  color: string;
  scale: number;
  length: number;
  width: number;
  opacity: number;
  separateEnds: boolean;
  startShape: 'stealth' | 'normal' | 'open' | 'openStealth' | 'diamond' | 'openDiamond' | 'circle' | 'openCircle';
  startColor: string;
  endShape: 'stealth' | 'normal' | 'open' | 'openStealth' | 'diamond' | 'openDiamond' | 'circle' | 'openCircle';
  endColor: string;
};

/** 绘制示例图形 */
export const ArrowAppearancePreview = (values: ArrowAppearancePreviewValues) => {
  const shared = {
    shape: values.shape,
    color: values.color,
    scale: values.scale,
    length: values.length,
    width: values.width,
    opacity: values.opacity,
  };
  const arrow = {
    ...(values.direction === '<-' || values.direction === '<->'
      ? { start: { ...shared, ...(values.separateEnds ? { shape: values.startShape, color: values.startColor } : {}) } }
      : {}),
    ...(values.direction === '->' || values.direction === '<->'
      ? { end: { ...shared, ...(values.separateEnds ? { shape: values.endShape, color: values.endColor } : {}) } }
      : {}),
  };
  return (
    <Layout
      viewBox={{ x: -40, y: -100, width: 440, height: 200 }}
      extensions={{ arrows: [diamondArrowDefinition, openDiamondArrowDefinition] }}
    >
      <Node id="A" position={[40, 0]} style={{ stroke: 'gray', dashed: true }}>
        a
      </Node>
      <Node id="B" position={[320, 0]} style={{ stroke: 'gray', dashed: true }}>
        b
      </Node>
      <Draw way={['A', 'B']} arrow={arrow} style={{ stroke: 'gray', strokeWidth: 2 }} />
    </Layout>
  );
};
