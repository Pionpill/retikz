import { Draw, Layout, Node } from '@retikz/react';
import { Array, Map } from '@retikz/standard-react/collection';
import type { FC } from 'react';

import type { Lang } from '@/i18n';

import { compositeReplayI18n } from './composite-replay.i18n';

/** 重放输出结构图的语言 */
export type CompositeReplayProps = { lang?: Lang };
/** 选中的输出句柄与最终 group / path 结构 */
const CompositeReplay: FC<CompositeReplayProps> = props => {
  const { lang = 'zh' } = props;
  const t = compositeReplayI18n[lang];
  return (
    <Layout style={{ maxWidth: '100%', height: 'auto' }}>
      <Array
        position={[0, 0]}
        items={[{ id: 'handle', content: 'H1', style: { fill: 'dodgerblue' } }]}
        index
        label={{ text: t.output, position: 'top', opacity: 0.8, font: { size: 12 } }}
        defaultCell={{ layout: { width: 280, height: 30 }, style: { font: { size: 13 } } }}
      />
      <Map
        id="record"
        position={[0, 105]}
        label={{ text: t.handle, position: 'top', opacity: 0.8, font: { size: 12 } }}
        entries={[
          { key: 'kind', value: 'replay' },
          { key: 'replay', value: 'T1' },
          { key: 'wrapper.transforms', value: 'translate(20, 30)' },
        ]}
        defaultCell={{
          layout: { height: 32 },
          style: { font: { size: 12 } },
          key: { layout: { width: 142 } },
          value: { layout: { width: 138 } },
        }}
      />
      <Map
        id="group"
        position={[370, 0]}
        label={{ text: t.group, position: 'top', opacity: 0.8, font: { size: 12 } }}
        entries={[
          { key: 'type', value: 'group' },
          { key: 'transforms', value: 'translate(20, 30)' },
          { key: 'children', value: { id: 'child', content: '[path]', style: { fill: 'dodgerblue' } } },
        ]}
        defaultCell={{
          layout: { height: 32 },
          style: { font: { size: 12 } },
          key: { layout: { width: 105 } },
          value: { layout: { width: 175 } },
        }}
      />
      <Map
        id="path"
        position={[370, 190]}
        label={{ text: t.path, position: 'top', opacity: 0.8, font: { size: 12 } }}
        entries={[
          { key: 'type', value: 'path' },
          { key: 'commands', value: 'M 0 0 · L 100 0' },
        ]}
        defaultCell={{
          layout: { height: 32 },
          style: { font: { size: 12 } },
          key: { layout: { width: 105 } },
          value: { layout: { width: 175 } },
        }}
      />
      <Draw way={['handle.left', { id: 'handle', anchor: 'left', offset: [-24, 0] }, '|-', 'record.left']} arrow="->" />
      <Draw way={['record.right', 'group.left']} arrow="->" />
      <Draw way={['child.right', { id: 'child', anchor: 'right', offset: [28, 0] }, '|-', 'path.right']} arrow="->" />
      <Node position={[325, 294]} style={{ stroke: 'none', fill: 'none', textColor: 'gray', font: { size: 12 } }}>
        {t.note}
      </Node>
    </Layout>
  );
};
export default CompositeReplay;
