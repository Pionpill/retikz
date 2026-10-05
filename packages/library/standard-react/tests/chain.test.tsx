import { createInputScene } from '@retikz/react';
import { chain, ChainInputEmbedAdapter } from '@retikz/standard-vanilla/collection';
import { normalizeScene, renderToSvgString, scene } from '@retikz/vanilla';
import { expect, it } from 'vitest';

import { Chain, ChainCell, ChainParallel, ChainBranch, Matrix } from '../src/collection';
import { synchronousAdapters } from './helpers/synchronous-adapters';

it('JSX 与 Vanilla 的嵌套分支和空单元等价', () => {
  const jsx = createInputScene(
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
  const options = { adapters: synchronousAdapters(jsx.adapters) };
  expect(normalizeScene(jsx.scene, options).ir).toEqual(
    normalizeScene(vanilla, { adapters: [ChainInputEmbedAdapter] }).ir,
  );
  expect(renderToSvgString(jsx.scene, options)).toEqual(
    renderToSvgString(vanilla, { adapters: [ChainInputEmbedAdapter] }),
  );
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
    const jsx = createInputScene(element);
    expect(renderToSvgString(jsx.scene, { adapters: synchronousAdapters(jsx.adapters) })).toContain('<svg');
  }
});
it('错误 marker 不能被静默忽略', () => {
  expect(() =>
    createInputScene(
      <Chain>
        <ChainBranch />
      </Chain>,
    ),
  ).toThrow();
});
