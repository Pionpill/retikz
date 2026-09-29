import type { IRNodeTarget } from '@retikz/core';
import { Draw, Layout, Node } from '@retikz/react';

type AnchorChoice = RectangleNodeConnectionPlaygroundPreviewValues['anchor'];

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
export type RectangleNodeConnectionPlaygroundPreviewValues = {
  sourceAngle: number;
  sourceDistance: number;
  cornerRadius: number;
  anchor: 'auto' | 'center' | 'top' | 'right' | 'bottom' | 'left' | 'angle';
  anchorAngle: number;
};

/** 绘制示例图形 */
export const RectangleNodeConnectionPlaygroundPreview = (values: RectangleNodeConnectionPlaygroundPreviewValues) => {
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
        cornerRadius={values.cornerRadius}
        style={{ fill: '#bfdbfe', stroke: '#2563eb' }}
        layout={{ minimumSize: { width: 96, height: 56 } }}
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
