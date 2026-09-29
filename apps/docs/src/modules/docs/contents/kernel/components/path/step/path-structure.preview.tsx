import { Layout, Path, Step } from '@retikz/react';

/** 图形参数 */
export type PathStructurePreviewValues = {
  structure: 'polyline' | 'subpaths' | 'fill';
  fill: string;
};

/** 绘制示例图形 */
export const PathStructurePreview = (values: PathStructurePreviewValues) => {
  return (
    <Layout viewBox={{ x: -220, y: -120, width: 440, height: 240 }}>
      <Path
        style={{
          stroke: values.structure === 'fill' ? values.fill : 'currentColor',
          strokeWidth: 2,
          ...(values.structure === 'fill' ? { fill: values.fill } : {}),
          fillOpacity: 0.35,
        }}
      >
        <Step kind="move" to={[-160, -55]} />
        {values.structure === 'subpaths' ? (
          <>
            <Step to={[-35, 45]} />
            <Step kind="move" to={[35, -45]} />
            <Step to={[160, 55]} />
          </>
        ) : (
          <>
            <Step to={[0, 55]} />
            <Step to={[160, -55]} />
            {values.structure === 'fill' && <Step kind="cycle" />}
          </>
        )}
      </Path>
    </Layout>
  );
};
