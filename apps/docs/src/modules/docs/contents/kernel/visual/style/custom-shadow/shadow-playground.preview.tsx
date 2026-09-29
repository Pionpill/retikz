import { Layout, Node } from '@retikz/react';

/** 图形参数 */
export type ShadowPlaygroundPreviewValues = {
  offsetX: number;
  offsetY: number;
  blur: number;
  color: string;
  opacity: number;
};

/** 绘制示例图形 */
export const ShadowPlaygroundPreview = (values: ShadowPlaygroundPreviewValues) => {
  return (
    <Layout viewBox={{ x: -140, y: -115, width: 280, height: 230 }}>
      <Node
        position={[0, 0]}
        shape="rectangle"
        style={{
          fill: 'white',
          shadow: {
            offsetX: values.offsetX,
            offsetY: values.offsetY,
            blur: values.blur,
            color: values.color,
            opacity: values.opacity,
          },
        }}
        layout={{ padding: { x: 34, y: 22 } }}
      >
        shadow
      </Node>
    </Layout>
  );
};
