import { Draw, Layout, Node } from '@retikz/react';
import type { FC } from 'react';

import type { Lang } from '@/i18n';

import { computationDependenciesI18n } from './computation-dependencies.i18n';

/** 依赖读取关系图的语言 */
export type ComputationDependenciesProps = Readonly<{ lang?: Lang }>;

/** 箭头从数据提供方指向依赖它的计算；注释列出下游定义字段与读取入口 */
const ComputationDependencies: FC<ComputationDependenciesProps> = props => {
  const { lang = 'zh' } = props;
  const text = computationDependenciesI18n[lang];
  return (
    <Layout>
      <Node id="dependency-position" position={[0, 0]} text={text.position} cornerRadius={4} layout={{ padding: 10 }} />
      <Node
        id="dependency-distance"
        position={[240, 0]}
        text={text.distance}
        cornerRadius={4}
        layout={{ padding: 10 }}
        style={{ stroke: 'dodgerblue', fill: 'dodgerblue', fillOpacity: 0.1 }}
      />
      <Node
        id="dependency-label"
        position={[500, 0]}
        text={text.label}
        cornerRadius={4}
        layout={{ padding: 10 }}
        style={{ stroke: 'dodgerblue', fill: 'dodgerblue', fillOpacity: 0.1 }}
      />
      <Draw way={['dependency-position', 'dependency-distance']} arrow="->" />
      <Draw way={['dependency-distance', 'dependency-label']} arrow="->" />
      <Node position={[120, 68]} text={text.first} style={{ stroke: 'none', fill: 'none', font: { size: 12 } }} />
      <Node position={[380, 68]} text={text.second} style={{ stroke: 'none', fill: 'none', font: { size: 12 } }} />
    </Layout>
  );
};
export default ComputationDependencies;
