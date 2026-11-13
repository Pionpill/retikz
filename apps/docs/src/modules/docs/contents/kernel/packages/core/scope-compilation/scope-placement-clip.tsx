import { Layout, Node, Scope } from '@retikz/react';
import type { FC } from 'react';

import type { Lang } from '@/i18n';

import { scopePlacementClipI18n } from './scope-placement-clip.i18n';

/** 示意图语言 */
export type ScopePlacementClipProps = { lang?: Lang };

/** 用同一对象对照本节的几何与状态变化 */
const ScopePlacementClip: FC<ScopePlacementClipProps> = props => {
  const { lang = 'zh' } = props;
  const text = scopePlacementClipI18n[lang];
  return (
    <Layout style={{ maxWidth: '100%', height: 'auto' }}>
      {text.titles.map((title, i) => (
        <Scope key={title} position={[i * 320, 0]}>
          <Node position={[0, -90]} style={{ fill: 'none', stroke: 'none', font: { size: 14 } }}>
            {title}
          </Node>
          <Scope position={i === 0 ? [0, 0] : [40, 30]}>
            <Node
              shape="rectangle"
              layout={{ minimumSize: { width: 160, height: 80 }, padding: 0 }}
              style={{ fill: 'none', stroke: 'gray', dashPattern: [1, 4], lineCap: 'round' }}
            />
            <Scope clip={i === 1 ? { kind: 'rect', params: { x: -40, y: -50, width: 80, height: 100 } } : undefined}>
              <Node
                shape="rectangle"
                layout={{ minimumSize: { width: 160, height: 80 }, padding: 0 }}
                style={{ fill: 'dodgerblue', opacity: { fill: 0.16 }, stroke: 'dodgerblue' }}
              >
                A
              </Node>
            </Scope>
            <Node
              shape="rectangle"
              layout={{ minimumSize: { width: 80, height: 100 }, padding: 0 }}
              style={{ fill: 'none', stroke: 'darkorange' }}
            />
          </Scope>
          <Node position={[0, 118]} style={{ fill: 'none', stroke: 'none', textColor: 'gray', font: { size: 12 } }}>
            {text.notes[i]}
          </Node>
        </Scope>
      ))}
      <Node position={[160, 154]} style={{ fill: 'none', stroke: 'none', textColor: 'gray', font: { size: 12 } }}>
        {text.footer}
      </Node>
    </Layout>
  );
};
export default ScopePlacementClip;
