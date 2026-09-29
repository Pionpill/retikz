import type { IRNodeTarget } from '@retikz/core';
import { Draw, Layout, Node } from '@retikz/react';
import { Circle, Rectangle } from '@retikz/standard-react/shape';

const SOURCE_DISTANCE = 125;

const TARGET_HALF_WIDTH = 52;

type AnchorChoice = PrimitiveRelationsPlaygroundPreviewValues['anchor'];

type BoundaryOverrideChoice = PrimitiveRelationsPlaygroundPreviewValues['boundaryOverride'];

const sourcePositionOf = (angle: number): [number, number] => {
  const radians = (angle * Math.PI) / 180;
  return [Math.cos(radians) * SOURCE_DISTANCE, Math.sin(radians) * SOURCE_DISTANCE];
};

const targetOf = (
  anchor: AnchorChoice,
  anchorAngle: number,
  boundaryOverride: BoundaryOverrideChoice,
): IRNodeTarget => ({
  id: 'T',
  ...(anchor === 'auto' ? {} : { anchor: anchor === 'angle' ? anchorAngle : anchor }),
  ...(boundaryOverride === 'inherit' ? {} : { boundary: boundaryOverride }),
});

/** 图形参数 */
export type PrimitiveRelationsPlaygroundPreviewValues = {
  sourceAngle: number;
  boundaryOverride: 'inherit' | 'shape' | 'circle';
  anchor: 'auto' | 'top' | 'right' | 'bottom' | 'left' | 'angle';
  anchorAngle: number;
};

/** 绘制示例图形 */
export const PrimitiveRelationsPlaygroundPreview = (values: PrimitiveRelationsPlaygroundPreviewValues) => {
  const sourcePosition = sourcePositionOf(values.sourceAngle);

  return (
    <Layout viewBox={{ x: -160, y: -140, width: 320, height: 280 }}>
      <Draw
        way={[[0, 0], sourcePosition]}
        zIndex={-3}
        style={{ stroke: 'lightgray', dashPattern: [1, 4], lineCap: 'round' }}
      />
      <Node
        id="T"
        position={[0, 0]}
        shape="ellipse"
        boundary="rectangle"
        style={{ fill: '#bfdbfe', stroke: '#2563eb' }}
        layout={{ minimumSize: { width: TARGET_HALF_WIDTH * 2, height: 64 } }}
      />
      {values.boundaryOverride === 'inherit' && (
        <Rectangle
          center={[0, 0]}
          width={TARGET_HALF_WIDTH * 2}
          height={64}
          zIndex={1}
          style={{ fill: 'none', stroke: '#64748b', strokeOpacity: 0.8, dashPattern: [4, 3] }}
        />
      )}
      {values.boundaryOverride === 'circle' && (
        <Circle
          center={[0, 0]}
          radius={TARGET_HALF_WIDTH}
          zIndex={1}
          style={{ fill: 'none', stroke: '#64748b', strokeOpacity: 0.8, dashPattern: [4, 3] }}
        />
      )}
      <Node
        id="A"
        position={sourcePosition}
        shape="circle"
        style={{ fill: '#64748b', stroke: 'none' }}
        layout={{ minimumSize: 16 }}
      />
      <Draw
        way={[{ id: 'A' }, targetOf(values.anchor, values.anchorAngle, values.boundaryOverride)]}
        arrow="->"
        zIndex={-1}
        style={{ stroke: '#64748b' }}
      />
    </Layout>
  );
};
