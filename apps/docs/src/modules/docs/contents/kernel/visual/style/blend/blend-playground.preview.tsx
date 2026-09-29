import { Layout, Node } from '@retikz/react';

/** 图形参数 */
export type BlendPlaygroundPreviewValues = {
  mode:
    | 'overlay'
    | 'color'
    | 'normal'
    | 'multiply'
    | 'screen'
    | 'darken'
    | 'lighten'
    | 'color-dodge'
    | 'color-burn'
    | 'hard-light'
    | 'soft-light'
    | 'difference'
    | 'exclusion'
    | 'hue'
    | 'saturation'
    | 'luminosity';
  background: string;
  sourceA: string;
  sourceB: string;
  opacity: number;
};

/** 绘制示例图形 */
export const BlendPlaygroundPreview = (values: BlendPlaygroundPreviewValues) => {
  const blendMode = values.mode;

  return (
    <Layout>
      <Node
        position={[0, 0]}
        shape="rectangle"
        style={{ fill: values.background, stroke: 'none' }}
        layout={{ minimumSize: { width: 220, height: 160 } }}
      />
      <Node
        position={[-26, 0]}
        shape="circle"
        style={{ fill: values.sourceA, stroke: 'none' }}
        layout={{ minimumSize: 100 }}
      />
      <Node
        position={[26, 0]}
        shape="circle"
        style={{ fill: values.sourceB, stroke: 'none', blendMode, opacity: values.opacity }}
        layout={{ minimumSize: 100 }}
      />
    </Layout>
  );
};
