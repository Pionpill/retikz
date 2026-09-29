import { Layout, Path, Step } from '@retikz/react';

/** 图形参数 */
export type PathMarksPreviewValues = {
  firstPosition: number;
  secondPosition: number;
};

/** 绘制示例图形 */
export const PathMarksPreview = (values: PathMarksPreviewValues) => {
  return (
    <Layout viewBox={{ x: -180, y: -80, width: 360, height: 160 }}>
      <Path
        marks={[
          { pos: values.firstPosition, mark: { kind: 'arrow', shape: 'stealth' } },
          { pos: values.secondPosition, mark: { kind: 'arrow', shape: 'stealth' } },
        ]}
        style={{ stroke: 'currentColor', strokeWidth: 1.5 }}
      >
        <Step kind="move" to={[-150, 20]} />
        <Step kind="cubic" control1={[-80, -70]} control2={[80, 90]} to={[150, 20]} />
      </Path>
    </Layout>
  );
};
