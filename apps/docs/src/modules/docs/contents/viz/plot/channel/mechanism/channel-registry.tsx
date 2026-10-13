import { Draw, Layout, Node } from '@retikz/react';
import { Array, Map } from '@retikz/standard-react/collection';
import type { FC } from 'react';

import type { Lang } from '@/i18n';

import { channelRegistryI18n } from './channel-registry.i18n';

/** 注册表结构图语言 */
export type ChannelRegistryProps = { lang?: Lang };
/** 名称索引保留首个定义，完整列表保留不同交付种类 */
const ChannelRegistry: FC<ChannelRegistryProps> = props => {
  const { lang = 'zh' } = props;
  const t = channelRegistryI18n[lang];
  const label = (text: string) => ({ text, position: 'top' as const, font: { size: 12 }, opacity: 0.8 });

  return (
    <Layout style={{ maxWidth: '100%', height: 'auto' }}>
      <Map
        position={[0, 30]}
        label={label(t.index)}
        entries={[
          { key: { content: 'size' }, value: { id: 'size-index', content: 'size / node' } },
          { key: { content: 'opacity' }, value: { id: 'opacity-index', content: 'opacity / node' } },
        ]}
        defaultCell={{
          style: { font: { size: 14 } },
          layout: { height: 36, padding: 0 },
          key: { layout: { width: 90 } },
          value: { layout: { width: 160 } },
        }}
      />
      <Node id="size-legend" position={[445, 48]} text={t.sizeLegend} cornerRadius={4} style={{ font: { size: 14 } }} />
      <Node
        id="opacity-legend"
        position={[445, 86]}
        text={t.opacityLegend}
        cornerRadius={4}
        style={{ font: { size: 14 } }}
      />
      <Draw way={['size-index', { via: '-|-' }, 'size-legend']} arrow="->" />
      <Draw way={['opacity-index', { via: '-|-' }, 'opacity-legend']} arrow="->" />
      <Array
        position={[0, 190]}
        label={label(t.list)}
        items={[
          { id: 'opacity-node', content: 'opacity / node', style: { fill: 'dodgerblue', opacity: { fill: 0.16 } } },
          { id: 'size-node', content: 'size / node', style: { fill: 'dodgerblue', opacity: { fill: 0.16 } } },
          { id: 'opacity-path', content: 'opacity / path', style: { fill: 'darkorange', opacity: { fill: 0.16 } } },
        ]}
        layout={{ direction: 'column', gap: 4 }}
        defaultCell={{ style: { font: { size: 14 } }, layout: { width: 250, height: 36, padding: 0 } }}
      />
      <Node
        id="point-target"
        position={[445, 227]}
        text={t.point}
        cornerRadius={4}
        style={{ font: { size: 14 }, stroke: 'dodgerblue' }}
      />
      <Node
        id="path-target"
        position={[445, 302]}
        text={t.path}
        cornerRadius={4}
        style={{ font: { size: 14 }, stroke: 'darkorange' }}
      />
      <Draw way={['opacity-node', { via: '-|-' }, 'point-target']} arrow="->" />
      <Draw way={['size-node', { via: '-|-' }, 'point-target']} arrow="->" />
      <Draw way={['opacity-path', { via: '-|-' }, 'path-target']} arrow="->" />
    </Layout>
  );
};
export default ChannelRegistry;
