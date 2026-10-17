import { Draw, Layout, Node } from '@retikz/react';
import { Array, Map } from '@retikz/standard-react/collection';
import type { FC } from 'react';

import type { Lang } from '@/i18n';

import { compositeDependenciesI18n } from './composite-dependencies.i18n';

/** 依赖装配图的语言 */
export type CompositeDependenciesProps = { lang?: Lang };
/** 展示依赖声明、装配后的定义及实例查找关系 */
const CompositeDependencies: FC<CompositeDependenciesProps> = props => {
  const { lang = 'zh' } = props;
  const t = compositeDependenciesI18n[lang];
  return (
    <Layout style={{ maxWidth: '100%', height: 'auto' }}>
      <Array
        position={[0, -100]}
        label={{ text: t.roots, position: 'top', font: { size: 12 }, opacity: 0.8 }}
        items={[{ id: 'root', content: 'chart.point' }]}
        defaultCell={{ layout: { width: 240, height: 30 }, style: { font: { size: 12 } } }}
      />
      <Map
        position={[0, 0]}
        label={{ text: t.providers, position: 'top', font: { size: 12 }, opacity: 0.8 }}
        entries={[
          { key: { id: 'provider-c', content: 'chart.point' }, value: 'FlexLayout, …' },
          { key: 'layout.flexLayout', value: '[]' },
        ]}
        defaultCell={{
          layout: { height: 34 },
          style: { font: { size: 12 } },
          key: { layout: { width: 140 } },
          value: { layout: { width: 100 } },
        }}
      />
      <Map
        position={[400, 0]}
        label={{ text: t.registry, position: 'top', font: { size: 12 }, opacity: 0.8 }}
        entries={[
          { key: 'layout.flexLayout', value: 'FlexLayout' },
          {
            key: { id: 'key-c', content: 'chart.point' },
            value: { id: 'definition-c', content: 'Chart (Point)', style: { fill: 'dodgerblue' } },
          },
        ]}
        defaultCell={{
          layout: { height: 34 },
          style: { font: { size: 12 } },
          key: { layout: { width: 140 } },
          value: { layout: { width: 100 } },
        }}
      />
      <Map
        id="instance"
        position={[400, 170]}
        label={{ text: t.instance, position: 'bottom', font: { size: 12 }, opacity: 0.8 }}
        entries={[
          { key: 'namespace', value: 'chart' },
          { key: 'type', value: 'point' },
        ]}
        defaultCell={{
          layout: { height: 30 },
          style: { font: { size: 12 } },
          key: { layout: { width: 100 } },
          value: { layout: { width: 140 } },
        }}
      />
      <Draw way={['root.left', [-24, -85], [-24, 17], 'provider-c.left']} arrow="->" />
      <Draw
        way={[
          [240, 34],
          [400, 34],
        ]}
        arrow="->"
      />
      <Node position={[320, 12]} style={{ stroke: 'none', fill: 'none', font: { size: 12 }, textColor: 'gray' }}>
        makeDefinition
      </Node>
      <Node position={[320, 58]} style={{ stroke: 'none', fill: 'none', font: { size: 12 }, textColor: 'gray' }}>
        {t.order}
      </Node>
      <Draw way={['instance.top', 'key-c.bottom']} arrow="->" />
      <Node position={[585, 100]} style={{ stroke: 'none', fill: 'none', font: { size: 12 }, textColor: 'gray' }}>
        {t.lookup}
      </Node>
      <Node position={[120, 188]} style={{ stroke: 'none', fill: 'none', font: { size: 12 }, textColor: 'gray' }}>
        {t.note}
      </Node>
    </Layout>
  );
};
export default CompositeDependencies;
