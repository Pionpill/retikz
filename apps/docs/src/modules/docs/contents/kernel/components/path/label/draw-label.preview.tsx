import { Draw, Layout, Node } from '@retikz/react';
import type { WayDSL } from '@retikz/vanilla';

const wayOf = (values: DrawLabelPreviewValues): WayDSL => {
  const label = {
    text: `t = ${values.position.toFixed(2)}\npath label`,
    position: values.position,
    side: values.side,
    sloped: values.sloped,
    textColor: values.textColor,
    textAlign: values.textAlign,
    lineHeight: values.lineHeight,
    maxTextWidth: values.maxTextWidth,
  } as const;
  if (values.segmentKind === 'line') return ['A', { label }, 'B'];
  if (values.segmentKind === 'curve') return ['A', { label }, { curve: [180, -110] }, 'B'];

  return ['A', { label }, values.segmentKind, 'B'];
};

/** 图形参数 */
export type DrawLabelPreviewValues = {
  segmentKind: 'line' | '-|' | '|-' | 'curve';
  position: number;
  side: 'top' | 'bottom' | 'left' | 'right' | 'center';
  sloped: boolean;
  textColor: string;
  /** 文本块内部对齐 */
  textAlign: 'start' | 'middle' | 'end';
  /** 最小行槽高度 */
  lineHeight: number;
  /** 自动折行宽度 */
  maxTextWidth: number;
};

/** 绘制示例图形 */
export const DrawLabelPreview = (values: DrawLabelPreviewValues) => {
  return (
    <Layout viewBox={{ x: -40, y: -120, width: 440, height: 240 }}>
      <Node id="A" position={[0, -60]} style={{ stroke: 'gray', dashed: true }}>
        a
      </Node>
      <Node id="B" position={[360, 60]} style={{ stroke: 'gray', dashed: true }}>
        b
      </Node>
      <Draw way={wayOf(values)} arrow="->" />
    </Layout>
  );
};
