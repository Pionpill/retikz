import { createInputScene } from '@retikz/react';
import { queue, QueueInputEmbedAdapter } from '@retikz/standard-vanilla/collection';
import { normalizeScene, renderToSvgString, scene } from '@retikz/vanilla';
import { expect, it } from 'vitest';

import { Queue, QueueItem, Matrix, ArrayItem } from '../src/collection';
import { synchronousAdapters } from './helpers/synchronous-adapters';

it('JSX与Vanilla的样式、空格、进入箭头和容器配置等价', () => {
  const props = {
    padding: 12,
    border: { style: { dashPattern: [4, 2] } },
    arrow: { input: { style: { stroke: 'blue' }, arrowDetail: { shape: 'openStealth' } }, output: false },
  };
  const jsx = createInputScene(
    <Queue {...props}>
      <QueueItem text="A" />
      <QueueItem id="top" />
    </Queue>,
  );
  const vanilla = scene({ children: [queue({ ...props, items: [{ content: 'A' }, { id: 'top' }] })] });
  const options = { adapters: synchronousAdapters(jsx.adapters) };
  expect(normalizeScene(jsx.scene, options).ir).toEqual(
    normalizeScene(vanilla, { adapters: [QueueInputEmbedAdapter] }).ir,
  );
  expect(renderToSvgString(jsx.scene, options)).toEqual(
    renderToSvgString(vanilla, { adapters: [QueueInputEmbedAdapter] }),
  );
});
it('嵌套Matrix及JSON内容使用相同自动依赖链', () => {
  for (const element of [
    <Queue />,
    <Queue data={[{ a: [1] }]} />,
    <Queue skeleton={{ count: 2 }} />,
    <Queue>
      <QueueItem>
        <Matrix skeleton={{ rows: 2, columns: 2 }} />
      </QueueItem>
    </Queue>,
  ]) {
    const jsx = createInputScene(element);
    expect(renderToSvgString(jsx.scene, { adapters: synchronousAdapters(jsx.adapters) })).toContain('<path');
  }
});
it('其他容器marker不能冒充QueueItem', () => {
  expect(() =>
    createInputScene(
      <Queue>
        <ArrayItem />
      </Queue>,
    ),
  ).toThrow();
});
