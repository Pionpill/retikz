import { convertReactToInputScene } from '@retikz/react';
import { chain } from '@retikz/standard-vanilla/collection';
import { compileToScene, normalizeScene, renderToSvg, scene } from '@retikz/vanilla';
import { expect, it } from 'vitest';

import { Chain, ChainCell, ChainParallel, ChainBranch, Matrix } from '../src/collection';

it('JSX 与 Vanilla 的嵌套分支和空单元等价', () => {
  const jsx = convertReactToInputScene(
    <Chain>
      <ChainCell text="A" />
      <ChainParallel>
        <ChainBranch>
          <ChainCell text="B" />
        </ChainBranch>
        <ChainBranch>
          <ChainCell />
        </ChainBranch>
      </ChainParallel>
      <ChainCell text="E" />
    </Chain>,
  );
  const vanilla = scene({
    children: [
      chain({
        items: [
          { kind: 'cell', content: 'A' },
          { kind: 'parallel', branches: [{ items: [{ kind: 'cell', content: 'B' }] }, { items: [{ kind: 'cell' }] }] },
          { kind: 'cell', content: 'E' },
        ],
      }),
    ],
  });

  expect(normalizeScene(jsx).ir).toEqual(normalizeScene(vanilla).ir);
  expect(renderToSvg(compileToScene(jsx).scene)).toEqual(renderToSvg(compileToScene(vanilla).scene));
});
it('任意图形与骨架依赖自动闭合', () => {
  for (const element of [
    <Chain />,
    <Chain skeleton={{ count: 2 }} />,
    <Chain skeleton={{ labels: ['a', 'b'] }} />,
    <Chain skeleton={{ items: ['a', { branches: [['b'], ['c']] }, 'd'] }} />,
    <Chain>
      <ChainCell>
        <Matrix skeleton={{ rows: 2, columns: 2 }} />
      </ChainCell>
      <ChainCell text="E" />
    </Chain>,
  ]) {
    const jsx = convertReactToInputScene(element);

    expect(renderToSvg(compileToScene(jsx).scene)).toContain('<svg');
  }
});
it('错误 marker 不能被静默忽略', () => {
  expect(() =>
    convertReactToInputScene(
      <Chain>
        <ChainBranch />
      </Chain>,
    ),
  ).toThrow();
});
