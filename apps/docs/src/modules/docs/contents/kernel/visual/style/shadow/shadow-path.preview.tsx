import { Layout, Path, Step } from '@retikz/react';

/** 图形参数 */
export type ShadowPathPreviewValues = {
  enabled: boolean;
  offsetX: number;
  offsetY: number;
  blur: number;
  color: string;
  opacity: number;
};

/** 绘制示例图形 */
export const ShadowPathPreview = (values: ShadowPathPreviewValues) => (
  <Layout viewBox={{ x: -150, y: -130, width: 300, height: 260 }}>
    <Path
      arrow="->"
      label={{ text: 'Path', side: 'top', position: 'midway', sloped: false }}
      style={{
        stroke: 'currentColor',
        strokeWidth: 4,
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
      <Step kind="move" to={[-70, 20]} />
      <Step kind="line" to={[70, -20]} />
    </Path>
  </Layout>
);
