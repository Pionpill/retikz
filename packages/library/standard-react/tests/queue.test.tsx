import { createInputScene } from '@retikz/react';
import { queue } from '@retikz/standard-vanilla/collection';
import { compileToScene, normalizeScene, renderToSvgString, scene } from '@retikz/vanilla';
import { expect, it } from 'vitest';

import { Queue, QueueItem, Matrix, ArrayItem } from '../src/collection';

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

  expect(normalizeScene(jsx).ir).toEqual(normalizeScene(vanilla).ir);
  expect(renderToSvgString(compileToScene(jsx).scene)).toEqual(renderToSvgString(compileToScene(vanilla).scene));
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
    expect(renderToSvgString(compileToScene(jsx).scene)).toContain('<path');
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
