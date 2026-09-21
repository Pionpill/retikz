import { Draw, Layout, Node } from '@retikz/react';
import { List, Map } from '@retikz/standard-react';
import type { FC } from 'react';

import type { Lang } from '@/i18n';

import { pathDeferredI18n } from './path-deferred.i18n';

/** 延迟路径数据结构图的语言 */
export type PathDeferredProps = { lang?: Lang };

/** 展示待处理任务如何引用输出容器及原位占位对象 */
const PathDeferred: FC<PathDeferredProps> = props => {
  const { lang = 'zh' } = props;
  const t = pathDeferredI18n[lang];
  return (
    <Layout style={{ maxWidth: '100%', height: 'auto' }}>
      <List
        transforms={[{ kind: 'translate', x: 0, y: 0 }]}
        label={{ text: t.queue, opacity: 0.8, font: { size: 12 } }}
        layout={{ width: 150, height: 36 }}
        items={[{ id: 'task', content: t.task, style: { fill: 'dodgerblue' } }]}
        style={{ font: { size: 13 } }}
        showIndex
      />
      <Map
        id="record"
        transforms={[{ kind: 'translate', x: 340, y: 0 }]}
        label={{ text: t.record, opacity: 0.8, font: { size: 12 } }}
        layout={{ height: 32, key: { width: 140 }, value: { width: 130 } }}
        style={{ font: { size: 13 } }}
        entries={[
          { key: { content: 'path' }, value: { content: t.path } },
          { key: { content: 'placeholderSlot' }, value: { id: 'slot-ref', content: '{ … }' } },
        ]}
      />
      <Map
        id="slot"
        transforms={[{ kind: 'translate', x: 340, y: 160 }]}
        label={{ text: t.slot, opacity: 0.8, font: { size: 12 } }}
        layout={{ height: 32, key: { width: 140 }, value: { width: 130 } }}
        style={{ font: { size: 13 } }}
        entries={[
          { key: { id: 'sink-ref', content: 'primitiveSink' }, value: { content: 'Array' } },
          {
            key: { id: 'placeholder-ref', content: 'placeholder' },
            value: { content: t.placeholder, style: { fill: 'dodgerblue' } },
          },
        ]}
      />
      <List
        id="sink"
        transforms={[{ kind: 'translate', x: 0, y: 165 }]}
        label={{ text: t.before, opacity: 0.8, font: { size: 12 } }}
        layout={{ direction: 'column', width: 170, height: 34 }}
        style={{ font: { size: 13 } }}
        items={[
          { id: 'placeholder', content: t.placeholder, style: { fill: 'dodgerblue' } },
          { content: 'Node a …' },
          { content: 'Node b …' },
        ]}
      />
      <List
        transforms={[{ kind: 'translate', x: 0, y: 385 }]}
        label={{ text: t.after, opacity: 0.8, font: { size: 12 } }}
        layout={{ direction: 'column', width: 170, height: 34 }}
        style={{ font: { size: 13 } }}
        items={[
          { id: 'output', content: 'PathPrim(a → b)', style: { fill: 'dodgerblue' } },
          { content: 'Node a …' },
          { content: 'Node b …' },
        ]}
      />
      <Draw
        way={[
          'task.right',
          { label: { text: t.expand, textColor: 'gray', font: { size: 12 } } },
          { horizontalTo: 'record.left' },
        ]}
        arrow="->"
      />
      <Draw way={['slot-ref.bottom', { verticalTo: 'slot.top' }]} arrow="->" />
      <Draw way={['sink-ref.left', [285, 176], [285, 130], [85, 130], 'sink.top']} arrow="->" />
      <Draw
        way={[
          'placeholder-ref.left',
          { label: { text: t.reference, textColor: 'gray', font: { size: 12 } } },
          [240, 210],
          '|-',
          'placeholder.right',
        ]}
        arrow="->"
      />
      <Draw
        way={[
          'sink.bottom',
          { label: { text: t.fill, side: 'right', textColor: 'gray', font: { size: 12 } } },
          { verticalTo: 'output.top' },
        ]}
        arrow="->"
      />
      <Node position={[300, 530]} text={t.note} style={{ stroke: 'none', textColor: 'gray', font: { size: 12 } }} />
    </Layout>
  );
};
export default PathDeferred;
