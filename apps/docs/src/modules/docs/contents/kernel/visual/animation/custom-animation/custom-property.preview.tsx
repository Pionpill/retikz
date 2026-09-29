import { Layout, Node } from '@retikz/react';
import type { AnimationPropertyDefinition } from '@retikz/render/animation';

import { createBlurIn } from './custom-property.data';

/** Canvas 上的自定义模糊动画属性 */
const blur: AnimationPropertyDefinition = {
  interpolate: (from, to, t) => (from as number) + ((to as number) - (from as number)) * t,
  applyCanvas: (ctx, _prim, value) => {
    ctx.filter = `blur(${value as number}px)`;
  },
};

/** 图形参数 */
export type CustomPropertyPreviewValues = { blur: number; duration: number };

/** 绘制自定义模糊动画示例 */
export const CustomPropertyPreview = (values: CustomPropertyPreviewValues) => (
  <Layout
    viewBox={{ x: -80, y: -50, width: 160, height: 100 }}
    key={`${values.blur}-${values.duration}`}
    renderer="canvas"
    animationProperties={{ blur }}
  >
    <Node
      id="a"
      position={[0, 0]}
      animations={[createBlurIn(values.blur, values.duration)]}
      style={{ fill: '#3b82f6' }}
    >
      blur
    </Node>
  </Layout>
);
