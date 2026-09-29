import { Coordinate, Draw, Layout, Node } from '@retikz/react';

/** 图形参数 */
export type ArrowEndpointOverlapPreviewValues = {
  shape: 'stealth' | 'normal' | 'open' | 'openStealth' | 'circle' | 'openCircle';
  overlap: number;
};

/** 绘制示例图形 */
export const ArrowEndpointOverlapPreview = (values: ArrowEndpointOverlapPreviewValues) => (
  <Layout viewBox={{ x: -170, y: -75, width: 340, height: 150 }}>
    <Coordinate id="A" position={[-120, 0]} />
    <Node
      id="B"
      position={[80, 0]}
      shape="rectangle"
      style={{
        fill: {
          kind: 'pattern',
          shape: 'lines',
          size: 9,
          rotation: 45,
          color: '#cbd5e1',
          background: '#f8fafc',
          lineWidth: 1,
        },
        stroke: '#94a3b8',
        strokeWidth: 1.5,
      }}
      layout={{ minimumSize: { width: 110, height: 76 } }}
    />
    <Draw
      way={['A', 'B']}
      arrow="->"
      arrowDetail={{ shape: values.shape, length: 14, width: 14, color: '#2563eb', lineWidth: 1.5 }}
      arrowPlacement={{ overlap: values.overlap }}
      style={{ stroke: '#2563eb', strokeWidth: 2 }}
    />
  </Layout>
);
