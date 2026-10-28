import { shape } from '@retikz/standard-vanilla/shape';
import { circleProvider } from '@retikz/standard/shape';
import { normalizeScene, scene } from '@retikz/vanilla';
import { expect, it } from 'vitest';

import * as rootEntry from '../src';
import { standardInputEmbedAdapters } from '../src';

it('通过 Vanilla 规范化保留循环意图、编写 ID 和确切的提供者', () => {
  const result = normalizeScene(scene({ children: [shape.circle({ id: 'c1', center: 'origin', radius: 20 })] }), {
    adapters: standardInputEmbedAdapters,
  });

  expect(result.ir.children[0]).toMatchObject({
    namespace: 'standard',
    type: 'circle',
    id: 'c1',
    center: { id: 'origin' },
    radius: 20,
  });
  expect(result.contributions).toEqual([{ roots: [circleProvider.key], providers: [circleProvider] }]);
});

it('使形状族远离根条目', () => {
  expect(rootEntry).not.toHaveProperty('shape');
});

it('标准化后保持匿名形状匿名', () => {
  const input = shape.circle({ center: [0, 0], radius: 20 });
  const result = normalizeScene(scene([input]), { adapters: standardInputEmbedAdapters });

  expect(input).not.toHaveProperty('id');
  expect(result.ir.children[0]).toEqual({ namespace: 'standard', type: 'circle', center: [0, 0], radius: 20 });
});
