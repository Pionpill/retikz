import type { IRNodeTarget } from '@retikz/core';
import { Draw, Layout, Node } from '@retikz/react';

type AnchorChoice = PolygonNodeConnectionPlaygroundPreviewValues['anchor'];

const sourcePositionOf = (angle: number, distance: number): [number, number] => {
  const radians = (angle * Math.PI) / 180;
  return [Math.cos(radians) * distance, Math.sin(radians) * distance];
};

const targetOf = (anchor: AnchorChoice, anchorAngle: number): IRNodeTarget => ({
  id: 'target',
  ...(anchor === 'auto' ? {} : { anchor: anchor === 'angle' ? anchorAngle : anchor }),
});

const sourceTarget: IRNodeTarget = { id: 'source' };

/** 图形参数 */
export type PolygonNodeConnectionPlaygroundPreviewValues = {
  sourceAngle: number;
  sourceDistance: number;
  shape: 'hexagon' | 'diamond';
  cornerRadius: number;
  anchor: 'auto' | 'center' | 'top' | 'right' | 'bottom' | 'left' | 'angle';
  anchorAngle: number;
};

/** 绘制示例图形 */
export const PolygonNodeConnectionPlaygroundPreview = (values: PolygonNodeConnectionPlaygroundPreviewValues) => {
  const sourcePosition = sourcePositionOf(values.sourceAngle, values.sourceDistance);
  const targetShape =
    values.shape === 'diamond'
      ? ('diamond' as const)
      : {
          type: 'polygon' as const,
          params: { sides: 6, rotate: 30, cornerRadius: values.cornerRadius },
        };

  return (
    <Layout viewBox={{ x: -215, y: -215, width: 430, height: 430 }}>
      <Draw
        way={[[0, 0], sourcePosition]}
        zIndex={-2}
        style={{ stroke: 'lightgray', dashPattern: [1, 4], lineCap: 'round' }}
      />
      <Node
        id="target"
        position={[0, 0]}
        shape={targetShape}
        style={{ fill: '#bfdbfe', stroke: '#2563eb' }}
        layout={{ minimumSize: { width: 96, height: 72 } }}
      />
      <Node
        id="source"
        position={sourcePosition}
        shape="circle"
        style={{ fill: 'gray', stroke: 'none' }}
        layout={{ minimumSize: 18 }}
      />
      <Draw
        way={[sourceTarget, targetOf(values.anchor, values.anchorAngle)]}
        arrow="->"
        zIndex={-1}
        style={{ stroke: 'gray' }}
      />
    </Layout>
  );
};
