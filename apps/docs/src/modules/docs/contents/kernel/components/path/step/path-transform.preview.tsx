import { Layout, Path, Step } from '@retikz/react';

/** 图形参数 */
export type PathTransformPreviewValues = {
  rotate: number;
  scale: [number, number];
};

/** 绘制示例图形 */
export const PathTransformPreview = (values: PathTransformPreviewValues) => {
  return (
    <Layout viewBox={{ x: -160, y: -110, width: 320, height: 220 }}>
      <Path style={{ stroke: '#94a3b8', strokeWidth: 1.5, dashPattern: [1, 4], lineCap: 'round' }}>
        <Step kind="move" to={[-55, -45]} />
        <Step kind="line" to={[-55, 45]} />
        <Step kind="line" to={[55, 45]} />
      </Path>
      <Path
        rotate={values.rotate}
        scale={{ x: values.scale[0], y: values.scale[1] }}
        style={{ stroke: 'dodgerblue', strokeWidth: 3 }}
      >
        <Step kind="move" to={[-55, -45]} />
        <Step kind="line" to={[-55, 45]} />
        <Step kind="line" to={[55, 45]} />
      </Path>
    </Layout>
  );
};
