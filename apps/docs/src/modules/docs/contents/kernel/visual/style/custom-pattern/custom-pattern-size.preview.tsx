import { definePattern } from '@retikz/core';
import { Layout, Node } from '@retikz/react';

const dotsGrid = definePattern({
  name: 'dotsGrid',
  defaultSize: 10,
  emit: ({ size, color }) => [{ type: 'ellipse', cx: size / 2, cy: size / 2, rx: 1.5, ry: 1.5, fill: color }],
});

/** 图形参数 */
export type CustomPatternSizePreviewValues = {
  background: 'transparent' | '#fef3c7' | '#0f172a';
  size: number;
  rotation: number;
  color: string;
};

/** 绘制示例图形 */
export const CustomPatternSizePreview = (values: CustomPatternSizePreviewValues) => {
  const background = values.background === 'transparent' ? undefined : values.background;

  return (
    <Layout extensions={{ patterns: [dotsGrid] }}>
      <Node
        id="a"
        position={[0, 0]}
        style={{ fill: { kind: 'pattern', shape: 'dotsGrid', size: 6, color: 'green' }, stroke: 'green' }}
        layout={{ minimumSize: { width: 90, height: 80 } }}
      />
      <Node
        id="b"
        position={[120, 0]}
        style={{
          fill: {
            kind: 'pattern',
            shape: 'dotsGrid',
            size: values.size,
            rotation: values.rotation,
            color: values.color,
            ...(background === undefined ? {} : { background }),
          },
          stroke: values.color,
        }}
        layout={{ minimumSize: { width: 90, height: 80 } }}
      />
    </Layout>
  );
};
