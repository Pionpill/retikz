import { shape } from '@retikz/standard-vanilla/shape';
import { CircleProvider } from '@retikz/standard/shape';
import { normalizeScene, scene } from '@retikz/vanilla';
import { expect, it } from 'vitest';

import * as rootEntry from '../src';
import { StandardInputEmbedAdapters } from '../src';

it('keeps circle intent, authored id and exact provider through Vanilla normalization', () => {
  const result = normalizeScene(scene({ children: [shape.circle({ id: 'c1', center: 'origin', radius: 20 })] }), {
    adapters: StandardInputEmbedAdapters,
  });
  expect(result.ir.children[0]).toMatchObject({
    namespace: 'standard',
    type: 'circle',
    id: 'c1',
    center: { id: 'origin' },
    radius: 20,
  });
  expect(result.contributions).toEqual([{ roots: [CircleProvider.key], providers: [CircleProvider] }]);
});

it('keeps the shape family out of the root entry', () => {
  expect(rootEntry).not.toHaveProperty('shape');
});

it('keeps anonymous shapes anonymous after normalization', () => {
  const input = shape.circle({ center: [0, 0], radius: 20 });
  const result = normalizeScene(scene([input]), { adapters: StandardInputEmbedAdapters });
  expect(input).not.toHaveProperty('id');
  expect(result.ir.children[0]).toEqual({ namespace: 'standard', type: 'circle', center: [0, 0], radius: 20 });
});
