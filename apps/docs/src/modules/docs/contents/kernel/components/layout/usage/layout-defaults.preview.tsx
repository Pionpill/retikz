import { Draw, Layout, Node } from '@retikz/react';

/** 图形参数 */
export type LayoutDefaultsPreviewValues = {
  stroke: string;
  strokeWidth: number;
  opacity: number;
  fill: string;
  padding: number;
};

/** 绘制示例图形 */
export const LayoutDefaultsPreview = (values: LayoutDefaultsPreviewValues) => (
  <Layout
    rootScope={{
      style: { stroke: values.stroke, strokeWidth: values.strokeWidth, opacity: values.opacity },
      defaults: { node: { style: { fill: values.fill, textColor: '#0f172a' }, layout: { padding: values.padding } } },
    }}
  >
    <Node id="A" position={[0, 0]}>
      a
    </Node>
    <Node id="B" position={[160, 0]}>
      b
    </Node>
    <Node id="C" position={[80, 100]}>
      c
    </Node>
    <Draw way={['A', 'B']} />
    <Draw way={['B', 'C']} />
    <Draw way={['C', 'A']} />
  </Layout>
);
