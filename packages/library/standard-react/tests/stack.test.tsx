import { createInputScene } from '@retikz/react';
import { stack, StackInputEmbedAdapter } from '@retikz/standard-vanilla/collection';
import { normalizeScene, renderToSvgString, scene } from '@retikz/vanilla';
import { expect, it } from 'vitest';

import { Stack, StackItem, Matrix, ArrayItem } from '../src/collection';
import { synchronousAdapters } from './helpers/synchronous-adapters';

it('JSX与Vanilla的样式、空格、进入箭头和容器配置等价', () => {
  const props = {
    padding: 12,
    border: { style: { dashPattern: [4, 2] } },
    arrow: { input: { style: { stroke: 'blue' }, arrowDetail: { shape: 'openStealth' } }, output: false },
  };
  const jsx = createInputScene(
    <Stack {...props}>
      <StackItem text="A" />
      <StackItem id="top" />
    </Stack>,
  );
  const vanilla = scene({ children: [stack({ ...props, items: [{ content: 'A' }, { id: 'top' }] })] });
  const options = { adapters: synchronousAdapters(jsx.adapters) };
  expect(normalizeScene(jsx.scene, options).ir).toEqual(
    normalizeScene(vanilla, { adapters: [StackInputEmbedAdapter] }).ir,
  );
  expect(renderToSvgString(jsx.scene, options)).toEqual(
    renderToSvgString(vanilla, { adapters: [StackInputEmbedAdapter] }),
  );
});
it('嵌套Matrix及JSON内容使用相同自动依赖链', () => {
  for (const element of [
    <Stack />,
    <Stack data={[{ a: [1] }]} />,
    <Stack skeleton={{ count: 2 }} />,
    <Stack>
      <StackItem>
        <Matrix skeleton={{ rows: 2, columns: 2 }} />
      </StackItem>
    </Stack>,
  ]) {
    const jsx = createInputScene(element);
    expect(renderToSvgString(jsx.scene, { adapters: synchronousAdapters(jsx.adapters) })).toContain('<path');
  }
});
it('其他容器marker不能冒充StackItem', () => {
  expect(() =>
    createInputScene(
      <Stack>
        <ArrayItem />
      </Stack>,
    ),
  ).toThrow();
});
