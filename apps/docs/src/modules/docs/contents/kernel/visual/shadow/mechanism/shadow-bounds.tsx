import { Draw, Layout, Node, Scope } from '@retikz/react';
import type { FC } from 'react';

import type { Lang } from '@/i18n';

import { shadowBoundsI18n } from './shadow-bounds.i18n';

/** 阴影边界图的语言参数 */
export type ShadowBoundsProps = { lang?: Lang };
/** 同一原几何、投影与估算边界保持相同尺度 */
const ShadowBounds: FC<ShadowBoundsProps> = props => {
  const { lang = 'zh' } = props;
  const text = shadowBoundsI18n[lang];
  return (
    <Layout style={{ maxWidth: '100%', height: 'auto' }}>
      {text.titles.map((title, index) => (
        <Scope key={title}>
          <Node position={[index * 190, -64]} style={{ fill: 'none', stroke: 'none', font: { size: 14 } }}>
            {title}
          </Node>
          <Node
            position={[index * 190, 0]}
            shape="rectangle"
            layout={{ minimumSize: { width: 100, height: 60 } }}
            style={{
              fill: 'dodgerblue',
              stroke: 'none',
              ...(index === 0 ? {} : { shadow: { offsetX: 12, offsetY: 8, blur: 6, color: 'gray', opacity: 0.8 } }),
            }}
          />
          <Draw
            way={[
              [index * 190 - 50, -30],
              [index * 190 + 50, -30],
              [index * 190 + 50, 30],
              [index * 190 - 50, 30],
              [index * 190 - 50, -30],
            ]}
            style={{ stroke: 'gray', dashPattern: [1, 4], lineCap: 'round' }}
          />
          {index === 2 && (
            <Draw
              way={[
                [324, -36],
                [448, -36],
                [448, 44],
                [324, 44],
                [324, -36],
              ]}
              style={{ stroke: 'darkorange', dashPattern: [1, 4], lineCap: 'round' }}
            />
          )}
          <Node
            position={[index * 190, 72]}
            style={{ fill: 'none', stroke: 'none', font: { size: 12 }, textColor: 'gray' }}
          >
            {text.notes[index]}
          </Node>
        </Scope>
      ))}
    </Layout>
  );
};
export default ShadowBounds;
