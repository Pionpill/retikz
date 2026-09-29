import { Draw, Layout, Node } from '@retikz/react';

/** 图形参数 */
export type DrawStylePreviewValues = {
  roundedCorners: number;
  arrow: '->' | 'none' | '<-' | '<->';
  stroke: string;
  strokeWidth: number;
  dashed: boolean;
  dashOffset: number;
};

/** 绘制示例图形 */
export const DrawStylePreview = (values: DrawStylePreviewValues) => {
  return (
    <Layout viewBox={{ x: -40, y: -120, width: 440, height: 240 }}>
      <Node id="A" position={[0, -50]} style={{ stroke: 'gray', dashed: true }}>
        a
      </Node>
      <Node id="B" position={[360, 50]} style={{ stroke: 'gray', dashed: true }}>
        b
      </Node>
      <Draw
        way={['A', [120, -50], [120, 50], [240, 50], [240, -50], 'B']}
        roundedCorners={values.roundedCorners}
        arrow={values.arrow}
        style={{
          stroke: values.stroke,
          strokeWidth: values.strokeWidth,
          ...(values.dashed ? { dashPattern: [8, 4] } : {}),
          dashOffset: values.dashOffset,
        }}
      />
    </Layout>
  );
};
