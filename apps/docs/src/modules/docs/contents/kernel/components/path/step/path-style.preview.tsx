import { Layout, Path, Step } from '@retikz/react';

/** 图形参数 */
export type PathStylePreviewValues = {
  thickness: 'thin' | 'semithick' | 'thick' | 'veryThick' | 'custom';
  stroke: string;
  strokeWidth: number;
  dashed: boolean;
  dashOffset: number;
  lineCap: 'round' | 'butt' | 'square';
  lineJoin: 'round' | 'miter' | 'bevel';
  opacity: number;
  strokeOpacity: number;
};

/** 绘制示例图形 */
export const PathStylePreview = (values: PathStylePreviewValues) => {
  const thickness = values.thickness === 'custom' ? undefined : values.thickness;

  return (
    <Layout viewBox={{ x: -220, y: -120, width: 440, height: 240 }}>
      <Path
        thickness={thickness}
        style={{
          stroke: values.stroke,
          ...(values.thickness === 'custom' ? { strokeWidth: values.strokeWidth } : {}),
          ...(values.dashed ? { dashPattern: [18, 10] } : {}),
          dashOffset: values.dashOffset,
          lineCap: values.lineCap,
          lineJoin: values.lineJoin,
          opacity: values.opacity,
          strokeOpacity: values.strokeOpacity,
        }}
      >
        <Step kind="move" to={[-175, 0]} />
        <Step to={[-55, -82]} />
        <Step to={[16, -28]} />
        <Step to={[158, -62]} />
        <Step to={[78, 0]} />
        <Step to={[158, 62]} />
        <Step to={[16, 28]} />
        <Step to={[-55, 82]} />
        <Step kind="cycle" />
        <Step kind="move" to={[-126, 0]} />
        <Step to={[-45, 0]} />
        <Step to={[16, -28]} />
      </Path>
    </Layout>
  );
};
