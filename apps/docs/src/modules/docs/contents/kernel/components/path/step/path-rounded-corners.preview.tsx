import { Layout, Path, Step } from '@retikz/react';

/** 图形参数 */
export type PathRoundedCornersPreviewValues = {
  strokeWidth: number;
  lineJoin: 'round' | 'miter' | 'bevel';
  radius: number;
};

/** 绘制示例图形 */
export const PathRoundedCornersPreview = (values: PathRoundedCornersPreviewValues) => {
  return (
    <Layout viewBox={{ x: -200, y: -130, width: 400, height: 260 }}>
      <Path style={{ stroke: '#94a3b8', strokeWidth: values.strokeWidth, lineJoin: values.lineJoin }}>
        <Step kind="move" to={[-150, -85]} />
        <Step to={[0, -85]} />
        <Step to={[0, -25]} />
      </Path>
      <Path style={{ stroke: '#334155', strokeWidth: 2 }}>
        <Step kind="move" to={[-150, -85]} />
        <Step to={[0, -85]} />
        <Step to={[0, -25]} />
      </Path>

      <Path roundedCorners={values.radius} style={{ stroke: '#93c5fd', strokeWidth: values.strokeWidth }}>
        <Step kind="move" to={[-150, 85]} />
        <Step to={[0, 85]} />
        <Step to={[0, 25]} />
      </Path>
      <Path roundedCorners={values.radius} style={{ stroke: '#2563eb', strokeWidth: 2 }}>
        <Step kind="move" to={[-150, 85]} />
        <Step to={[0, 85]} />
        <Step to={[0, 25]} />
      </Path>
    </Layout>
  );
};
