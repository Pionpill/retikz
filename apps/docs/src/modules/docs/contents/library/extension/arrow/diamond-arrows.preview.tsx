import { DiamondArrowDefinition, OpenDiamondArrowDefinition } from '@retikz/extension';
import { Draw, Layout, Node } from '@retikz/react';

/** 图形参数 */
export type DiamondArrowsPreviewValues = {
  color: string;
  scale: number;
  lineWidth: number;
};

/** 绘制示例图形 */
export const renderDiamondArrowsPreview = (values: DiamondArrowsPreviewValues) => {
  const detail = { color: values.color, scale: values.scale, lineWidth: values.lineWidth };
  return (
    <Layout
      viewBox={{ x: -210, y: -80, width: 420, height: 160 }}
      extensions={{ arrows: [DiamondArrowDefinition, OpenDiamondArrowDefinition] }}
    >
      <Draw
        way={[
          [-140, 10],
          [-20, 10],
        ]}
        arrow="->"
        arrowDetail={{ ...detail, end: { ...detail, shape: 'diamond' } }}
        style={{ stroke: '#94a3b8', strokeWidth: 2 }}
      />
      <Draw
        way={[
          [20, 10],
          [140, 10],
        ]}
        arrow="->"
        arrowDetail={{ ...detail, end: { ...detail, shape: 'openDiamond' } }}
        style={{ stroke: '#94a3b8', strokeWidth: 2 }}
      />
      <Node position={[-80, -35]} style={{ fill: 'none', stroke: 'none', font: { size: 12 }, textColor: 'gray' }}>
        diamond
      </Node>
      <Node position={[80, -35]} style={{ fill: 'none', stroke: 'none', font: { size: 12 }, textColor: 'gray' }}>
        openDiamond
      </Node>
    </Layout>
  );
};
