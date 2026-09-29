import { Layout, Path, Step } from '@retikz/react';

/** 图形参数 */
export type PathZIndexPreviewValues = {
  zIndex: number;
};

/** 绘制示例图形 */
export const PathZIndexPreview = (values: PathZIndexPreviewValues) => {
  return (
    <Layout viewBox={{ x: 0, y: 0, width: 220, height: 200 }}>
      <Path zIndex={values.zIndex} style={{ fill: 'dodgerblue', stroke: 'dodgerblue', strokeWidth: 2 }}>
        <Step kind="move" to={[20, 20]} />
        <Step kind="line" to={[120, 20]} />
        <Step kind="line" to={[120, 120]} />
        <Step kind="line" to={[20, 120]} />
        <Step kind="cycle" />
      </Path>
      <Path style={{ fill: 'red', stroke: 'red', strokeWidth: 2 }}>
        <Step kind="move" to={[70, 70]} />
        <Step kind="line" to={[170, 70]} />
        <Step kind="line" to={[170, 170]} />
        <Step kind="line" to={[70, 170]} />
        <Step kind="cycle" />
      </Path>
    </Layout>
  );
};
