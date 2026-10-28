import { createProcessingController, normalizeScene, scene } from '@retikz/vanilla';
import type { InputPath } from '@retikz/vanilla';
import { expect, it } from 'vitest';

import { standardInputEmbedAdapters } from '../src';
import { chain, matrix } from '../src/collection';

it('嵌套内容失败时保留上一次完整链，随后可正常更新', () => {
  const controller = createProcessingController(scene({ children: [chain({ items: ['A', 'B'] })] }), {
    adapters: standardInputEmbedAdapters,
  });
  const previous = controller.read();

  expect(() =>
    controller.update(
      scene({
        children: [
          chain({
            items: ['A', { kind: 'cell', content: { type: 'node', position: [0, 0], shape: 'missing-chain-shape' } }],
          }),
        ],
      }),
    ),
  ).toThrow();
  expect(controller.read()).toBe(previous);

  controller.update(scene({ children: [chain({ skeleton: { items: ['A', { branches: [['B'], ['C']] }, 'D'] } })] }));

  expect(controller.read().revision).toBe(previous.revision + 1);

  controller.dispose();
});

it('三入口和嵌套内容进入 retained 时保持 JSON-safe', () => {
  for (const child of [
    chain({ items: [{ kind: 'cell' }, { kind: 'cell', content: matrix({ skeleton: { rows: 2, columns: 2 } }) }] }),
    chain({ data: [{ a: [1, 2] }] }),
    chain({ skeleton: { items: ['a', { branches: [['b'], ['c']] }, 'd'] } }),
  ]) {
    const controller = createProcessingController(scene({ children: [child] }), {
      adapters: standardInputEmbedAdapters,
    });

    expect(controller.read().scene.primitives.length).toBeGreaterThan(0);

    controller.dispose();
  }
});
it('显式空箭头与空 marks 均被保留', () => {
  for (const path of [{ arrow: {} }, { arrow: {}, marks: [] }]) {
    const result = normalizeScene(scene({ children: [chain({ items: ['a', 'b'], defaultConnection: { path } })] }), {
      adapters: standardInputEmbedAdapters,
    });

    expect(JSON.stringify(result.ir)).toContain('"arrow":{}');
  }
});

it('连接箭头方向简写与端点对象经 Kernel 归一化后等价', () => {
  const normalize = (arrow: InputPath['arrow']) =>
    normalizeScene(scene({ children: [chain({ items: ['a', 'b'], defaultConnection: { path: { arrow } } })] }), {
      adapters: standardInputEmbedAdapters,
    }).ir;
  expect(normalize('->')).toEqual(normalize({ end: {} }));
});
