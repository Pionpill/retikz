import { CircleClipDefinition, CompoundClipDefinition } from '@retikz/extension';
import { Layout, Node, Scope } from '@retikz/react';

/** 图形参数 */
export type CompoundClipPreviewValues = {
  fillRule: 'evenodd' | 'nonzero';
  offset: number;
  radius: number;
};

/** 绘制示例图形 */
export const renderCompoundClipPreview = (values: CompoundClipPreviewValues) => (
  <Layout
    viewBox={{ x: -165, y: -100, width: 330, height: 200 }}
    extensions={{ clips: [CompoundClipDefinition, CircleClipDefinition] }}
  >
    <Node
      position={[0, 0]}
      shape="rectangle"
      style={{ fill: 'none', stroke: 'lightgray', strokeWidth: 1, dashPattern: [6, 4] }}
      layout={{ minimumSize: { width: 300, height: 170 } }}
    />
    <Scope
      clip={{
        kind: 'compound',
        fillRule: values.fillRule,
        children: [
          { kind: 'circle', cx: -values.offset / 2, cy: 0, r: values.radius },
          { kind: 'circle', cx: values.offset / 2, cy: 0, r: values.radius },
        ],
      }}
    >
      <Node
        position={[0, 0]}
        shape="rectangle"
        style={{ stroke: 'none', fill: { kind: 'pattern', shape: 'grid', color: '#2563eb', size: 14 } }}
        layout={{ minimumSize: { width: 300, height: 170 } }}
      />
    </Scope>
  </Layout>
);
