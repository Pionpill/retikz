import type { IRNodeTarget } from '@retikz/core';
import { Draw, Layout, Node } from '@retikz/react';

type AnchorChoice = CircleEllipseNodeConnectionPlaygroundPreviewValues['anchor'];

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
export type CircleEllipseNodeConnectionPlaygroundPreviewValues = {
  sourceAngle: number;
  sourceDistance: number;
  shape: 'ellipse' | 'circle';
  anchor: 'auto' | 'center' | 'top' | 'right' | 'bottom' | 'left' | 'angle';
  anchorAngle: number;
};

/** 绘制示例图形 */
export const CircleEllipseNodeConnectionPlaygroundPreview = (
  values: CircleEllipseNodeConnectionPlaygroundPreviewValues,
) => {
  const sourcePosition = sourcePositionOf(values.sourceAngle, values.sourceDistance);

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
        shape={values.shape}
        style={{ fill: '#bfdbfe', stroke: '#2563eb' }}
        layout={{ padding: { x: 24, y: 8 } }}
      >
        A
      </Node>
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
