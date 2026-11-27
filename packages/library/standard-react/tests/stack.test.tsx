import { convertReactToInputScene } from '@retikz/react';
import { stack } from '@retikz/standard-vanilla/collection';
import { compileToScene, normalizeScene, renderToSvg, scene } from '@retikz/vanilla';
import { expect, it } from 'vitest';

import { Stack, StackItem, Matrix, ArrayItem } from '../src/collection';

it('JSX与Vanilla的样式、空格、进入箭头和容器配置等价', () => {
  const props = {
    padding: 12,
    border: { style: { dashPattern: [4, 2] } },
    arrow: { input: { style: { stroke: 'blue' }, arrowDetail: { shape: 'openStealth' } }, output: false },
  };
  const jsx = convertReactToInputScene(
    <Stack {...props}>
      <StackItem text="A" />
      <StackItem id="top" />
    </Stack>,
  );
  const vanilla = scene({ children: [stack({ ...props, items: [{ content: 'A' }, { id: 'top' }] })] });

  expect(normalizeScene(jsx).ir).toEqual(normalizeScene(vanilla).ir);
  expect(renderToSvg(compileToScene(jsx).scene)).toEqual(renderToSvg(compileToScene(vanilla).scene));
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
    const jsx = convertReactToInputScene(element);
    expect(renderToSvg(compileToScene(jsx).scene)).toContain('<path');
  }
});
it('其他容器marker不能冒充StackItem', () => {
  expect(() =>
    convertReactToInputScene(
      <Stack>
        <ArrayItem />
      </Stack>,
    ),
  ).toThrow();
});
