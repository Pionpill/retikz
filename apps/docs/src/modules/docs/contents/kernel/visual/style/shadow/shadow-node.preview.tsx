import { Layout, Node } from '@retikz/react';

/** 图形参数 */
export type ShadowNodePreviewValues = {
  enabled: boolean;
  offsetX: number;
  offsetY: number;
  blur: number;
  color: string;
  opacity: number;
};

/** 绘制示例图形 */
export const ShadowNodePreview = (values: ShadowNodePreviewValues) => (
  <Layout viewBox={{ x: -150, y: -130, width: 300, height: 260 }}>
    <Node
      position={[0, 0]}
      label={{ text: 'label', position: 'top' }}
      layout={{ minimumSize: { width: 100, height: 64 } }}
      style={{
        fill: 'lightskyblue',
        shadow: values.enabled
          ? {
              offsetX: values.offsetX,
              offsetY: values.offsetY,
              blur: values.blur,
              color: values.color,
              opacity: values.opacity,
            }
          : 'none',
      }}
    >
      Node
    </Node>
  </Layout>
);
