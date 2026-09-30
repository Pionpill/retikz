import { RibbonPathKindDefinition } from '@retikz/extension';
import { Layout, Path } from '@retikz/react';

/** 只改变下边界位置与采样，保持上边界和取景固定 */
export const renderRibbonBoundaryPreview = (values: { lowerOffset: number }) => (
  <Layout
    viewBox={{ x: -260, y: -130, width: 520, height: 260 }}
    extensions={{ pathKinds: [RibbonPathKindDefinition] }}
  >
    <Path
      kind="ribbon"
      kindOptions={{
        mode: 'boundary',
        upper: [
          { type: 'step', kind: 'move', to: [-220, -64] },
          { type: 'step', kind: 'cubic', control1: [-80, -96], control2: [92, -36], to: [220, -28] },
        ],
        lower: [
          { type: 'step', kind: 'move', to: [-220, -18 + values.lowerOffset] },
          {
            type: 'step',
            kind: 'cubic',
            control1: [-60, 16 + values.lowerOffset],
            control2: [92, 74 + values.lowerOffset],
            to: [220, 66 + values.lowerOffset],
          },
        ],
      }}
      style={{ fill: '#60a5fa', fillOpacity: 0.74, stroke: '#1d4ed8', strokeWidth: 1 }}
    />
  </Layout>
);
