import { PathClipDefinition } from '@retikz/extension';
import { Layout, Node, Scope } from '@retikz/react';

/** 图形参数 */
export type PathClipPreviewValues = {
  fillRule: 'evenodd' | 'nonzero';
  halfHeight: number;
  tipX: number;
  notchX: number;
  holeSize: number;
};

/** 绘制示例图形 */
export const renderPathClipPreview = (values: PathClipPreviewValues) => (
  <Layout viewBox={{ x: -125, y: -100, width: 250, height: 200 }} extensions={{ clips: [PathClipDefinition] }}>
    <Node
      position={[0, 0]}
      shape="rectangle"
      style={{ fill: 'none', stroke: 'lightgray', strokeWidth: 1, dashPattern: [6, 4] }}
      layout={{ minimumSize: { width: 220, height: 170 } }}
    />
    <Scope
      clip={{
        kind: 'path',
        fillRule: values.fillRule,
        commands: [
          { kind: 'move', to: [-82, -values.halfHeight] },
          { kind: 'line', to: [18, -values.halfHeight] },
          { kind: 'line', to: [values.tipX, 0] },
          { kind: 'line', to: [18, values.halfHeight] },
          { kind: 'line', to: [-82, values.halfHeight] },
          { kind: 'line', to: [values.notchX, 0] },
          { kind: 'close' },
          { kind: 'move', to: [-values.holeSize, 0] },
          { kind: 'line', to: [0, -values.holeSize] },
          { kind: 'line', to: [values.holeSize, 0] },
          { kind: 'line', to: [0, values.holeSize] },
          { kind: 'close' },
        ],
      }}
    >
      <Node
        position={[0, 0]}
        shape="rectangle"
        style={{ stroke: 'none', fill: { kind: 'pattern', shape: 'grid', color: 'darkorange', size: 14 } }}
        layout={{ minimumSize: { width: 220, height: 170 } }}
      />
    </Scope>
  </Layout>
);
