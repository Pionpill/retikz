import { Layout, Node, Path, Scope, Step } from '@retikz/react';
import type { FC } from 'react';

import type { Lang } from '@/i18n';

import { pathRelativeI18n } from './path-relative.i18n';

/** 相对路径图的语言 */
export type PathRelativeProps = { lang?: Lang };
/** 使用真实相对目标展示基准是否推进 */
const PathRelative: FC<PathRelativeProps> = props => {
  const { lang = 'zh' } = props;
  const text = pathRelativeI18n[lang];
  return (
    <Layout style={{ maxWidth: '100%', height: 'auto' }}>
      {text.titles.map((title, i) => (
        <Scope key={title} position={[i * 310, 0]}>
          <Node position={[60, -42]} style={{ fill: 'none', stroke: 'none', font: { size: 14 } }}>
            {title}
          </Node>
          <Path style={{ stroke: 'dodgerblue', strokeWidth: 2 }}>
            <Step kind="move" to={[0, 0]} />
            <Step kind="line" to={i === 0 ? { relative: [60, 30] } : { relativeAccumulate: [60, 30] }} />
            <Step kind="line" to={i === 0 ? { relative: [60, 30] } : { relativeAccumulate: [60, 30] }} />
          </Path>
          <Node
            position={[0, 0]}
            shape="circle"
            layout={{ minimumSize: 5, padding: 0 }}
            style={{ fill: 'gray', stroke: 'none' }}
          />
          <Node
            position={[i === 0 ? 60 : 120, i === 0 ? 30 : 60]}
            shape="circle"
            layout={{ minimumSize: 5, padding: 0 }}
            style={{ fill: 'dodgerblue', stroke: 'none' }}
          />
          <Node position={[60, 98]} style={{ fill: 'none', stroke: 'none', textColor: 'gray', font: { size: 12 } }}>
            {text.ends[i]}
          </Node>
        </Scope>
      ))}
    </Layout>
  );
};
export default PathRelative;
