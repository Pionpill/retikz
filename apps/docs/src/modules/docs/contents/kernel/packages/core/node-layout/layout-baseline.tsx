import { Draw, Layout, Node } from '@retikz/react';
import type { FC } from 'react';

import type { Lang } from '@/i18n';

import { layoutBaselineI18n } from './layout-baseline.i18n';

/** 基线度量图的语言 */
export type LayoutBaselineProps = { lang?: Lang };

/** 按六倍比例绘制 24 高行槽和 14/4 上下伸度量 */
const LayoutBaseline: FC<LayoutBaselineProps> = props => {
  const { lang = 'zh' } = props;
  const text = layoutBaselineI18n[lang];
  return (
    <Layout
      rootScope={{ defaults: { node: { style: { fill: 'none', stroke: 'none', font: { size: 14 } } } } }}
      style={{ maxWidth: '100%', height: 'auto' }}
    >
      <Node
        position={[0, 72]}
        shape="rectangle"
        layout={{ minimumSize: { width: 240, height: 144 }, padding: 0 }}
        style={{ stroke: 'gray', dashPattern: [1, 4] }}
      />
      <Node
        position={[0, 72]}
        shape="rectangle"
        layout={{ minimumSize: { width: 240, height: 108 }, padding: 0 }}
        style={{ fill: 'gray', opacity: { fill: 0.14 } }}
      />
      <Draw
        way={[
          [-130, 102],
          [130, 102],
        ]}
        style={{ stroke: 'dodgerblue' }}
      />
      <Node position={[0, -24]}>{text.slot}</Node>
      <Node position={[0, 46]}>{text.glyph}</Node>
      <Node position={[0, 84]} style={{ textColor: 'gray', font: { size: 12 } }}>
        ascent = 14
      </Node>
      <Node position={[0, 115]} style={{ textColor: 'gray', font: { size: 12 } }}>
        descent = 4
      </Node>
      <Node position={[236, 9]} style={{ textColor: 'gray', font: { size: 12 } }}>
        {text.top}
      </Node>
      <Node position={[236, 102]} style={{ textColor: 'dodgerblue', font: { size: 12 } }}>
        {text.baseline}
      </Node>
      <Node position={[236, 135]} style={{ textColor: 'gray', font: { size: 12 } }}>
        {text.bottom}
      </Node>
    </Layout>
  );
};
export default LayoutBaseline;
