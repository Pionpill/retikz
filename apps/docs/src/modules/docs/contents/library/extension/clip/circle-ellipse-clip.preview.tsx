import { CircleClipDefinition, EllipseClipDefinition } from '@retikz/extension';
import { Layout, Node, Scope } from '@retikz/react';

const clippedContent = (centerX: number) => (
  <Node
    position={[centerX, 0]}
    shape="rectangle"
    style={{ stroke: 'none', fill: { kind: 'pattern', shape: 'grid', color: '#2563eb', size: 14 } }}
    layout={{ minimumSize: { width: 170, height: 150 } }}
  />
);

const sourceBoundary = (centerX: number) => (
  <Node
    position={[centerX, 0]}
    shape="rectangle"
    style={{ fill: 'none', stroke: 'lightgray', strokeWidth: 1, dashPattern: [6, 4] }}
    layout={{ minimumSize: { width: 170, height: 150 } }}
  />
);

/** 图形参数 */
export type CircleEllipseClipPreviewValues = {
  circleRadius: number;
  ellipseRadiusX: number;
  ellipseRadiusY: number;
};

/** 绘制示例图形 */
export const renderCircleEllipseClipPreview = (values: CircleEllipseClipPreviewValues) => (
  <Layout
    viewBox={{ x: -220, y: -110, width: 440, height: 220 }}
    extensions={{ clips: [CircleClipDefinition, EllipseClipDefinition] }}
  >
    {sourceBoundary(-105)}
    <Scope clip={{ kind: 'circle', cx: -105, cy: 0, r: values.circleRadius }}>{clippedContent(-105)}</Scope>
    {sourceBoundary(105)}
    <Scope
      clip={{
        kind: 'ellipse',
        cx: 105,
        cy: 0,
        rx: values.ellipseRadiusX,
        ry: values.ellipseRadiusY,
      }}
    >
      {clippedContent(105)}
    </Scope>
    <Node position={[-105, 90]} style={{ fill: 'none', stroke: 'none', font: { size: 12 }, textColor: 'gray' }}>
      circle
    </Node>
    <Node position={[105, 90]} style={{ fill: 'none', stroke: 'none', font: { size: 12 }, textColor: 'gray' }}>
      ellipse
    </Node>
  </Layout>
);
