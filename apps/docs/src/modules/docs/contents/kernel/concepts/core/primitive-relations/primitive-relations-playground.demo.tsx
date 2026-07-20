import type { IRNodeTarget } from '@retikz/core';
import type { FC } from 'react';

import { Circle, Draw, Layout, Node, Rectangle } from '@retikz/react';

import type { PreviewControlValuesFor, PreviewSourceConfig } from '@/modules/docs/components/component-preview/author';

import { usePreviewControls } from '@/modules/docs/components/component-preview/author';

import { primitiveRelationsPlaygroundControls } from './primitive-relations-playground.controls';

export const previewControls = primitiveRelationsPlaygroundControls;

export const previewSource = {
  deriveIR: false,
} satisfies PreviewSourceConfig;

const SOURCE_DISTANCE = 125;
const TARGET_HALF_WIDTH = 52;

type PrimitiveRelationsPlaygroundValues = PreviewControlValuesFor<typeof primitiveRelationsPlaygroundControls>;
type AnchorChoice = PrimitiveRelationsPlaygroundValues['anchor'];
type BoundaryOverrideChoice = PrimitiveRelationsPlaygroundValues['boundaryOverride'];

/** 把来源图元放到目标周围的固定轨道上 */
const sourcePositionOf = (angle: number): [number, number] => {
  const radians = (angle * Math.PI) / 180;
  return [Math.cos(radians) * SOURCE_DISTANCE, Math.sin(radians) * SOURCE_DISTANCE];
};

/** 把端点策略、数字角度与单边 boundary 覆盖转换为公开 target */
const targetOf = (
  anchor: AnchorChoice,
  anchorAngle: number,
  boundaryOverride: BoundaryOverrideChoice,
): IRNodeTarget => ({
  id: 'T',
  ...(anchor === 'auto' ? {} : { anchor: anchor === 'angle' ? anchorAngle : anchor }),
  ...(boundaryOverride === 'inherit' ? {} : { boundary: boundaryOverride }),
});

/**
 * 图元关系端点 playground
 * @description 固定目标与取景，让来源沿轨道移动，对比自动贴边、显式 anchor 与单条边 boundary 覆盖
 */
const Demo: FC = () => {
  const values = usePreviewControls(primitiveRelationsPlaygroundControls);
  const sourcePosition = sourcePositionOf(values.sourceAngle);

  return (
    <Layout width={400} height={300} viewBox={{ x: -160, y: -140, width: 320, height: 280 }}>
      <Draw way={[[0, 0], sourcePosition]} stroke="lightgray" dashPattern={[1, 4]} lineCap="round" zIndex={-3} />
      <Node
        id="T"
        position={[0, 0]}
        shape="ellipse"
        boundary="rectangle"
        minimumSize={{ width: TARGET_HALF_WIDTH * 2, height: 64 }}
        fill="#bfdbfe"
        stroke="#2563eb"
      />
      {values.boundaryOverride === 'inherit' && (
        <Rectangle
          center={[0, 0]}
          width={TARGET_HALF_WIDTH * 2}
          height={64}
          fill="none"
          stroke="#64748b"
          strokeOpacity={0.8}
          dashPattern={[4, 3]}
          zIndex={1}
        />
      )}
      {values.boundaryOverride === 'circle' && (
        <Circle
          center={[0, 0]}
          radius={TARGET_HALF_WIDTH}
          fill="none"
          stroke="#64748b"
          strokeOpacity={0.8}
          dashPattern={[4, 3]}
          zIndex={1}
        />
      )}
      <Node id="A" position={sourcePosition} shape="circle" minimumSize={16} fill="#64748b" stroke="none" />
      <Draw
        way={[{ id: 'A' }, targetOf(values.anchor, values.anchorAngle, values.boundaryOverride)]}
        arrow="->"
        stroke="#64748b"
        zIndex={-1}
      />
    </Layout>
  );
};

export default Demo;
