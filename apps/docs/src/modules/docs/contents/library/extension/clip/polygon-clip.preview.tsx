import { PolygonClipDefinition } from '@retikz/extension';
import { Layout, Node, Scope } from '@retikz/react';

/** 图形参数 */
export type PolygonClipPreviewValues = {
  top: [number, number];
  right: [number, number];
  left: [number, number];
};

/** 绘制示例图形 */
export const renderPolygonClipPreview = (values: PolygonClipPreviewValues) => (
  <Layout viewBox={{ x: 0, y: 0, width: 200, height: 200 }} extensions={{ clips: [PolygonClipDefinition] }}>
    <Node
      position={[100, 100]}
      shape="rectangle"
      style={{ fill: 'none', stroke: 'lightgray', strokeWidth: 1, dashPattern: [6, 4] }}
      layout={{ minimumSize: { width: 192, height: 180 } }}
    />
    <Scope clip={{ kind: 'polygon', points: [values.top, values.right, values.left] }}>
      <Node
        position={[100, 100]}
        shape="rectangle"
        style={{ stroke: 'none', fill: { kind: 'pattern', shape: 'grid', color: 'darkorange', size: 14 } }}
        layout={{ minimumSize: { width: 192, height: 180 } }}
      />
    </Scope>
  </Layout>
);
