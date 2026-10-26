import { createInputScene } from '@retikz/react';
import { Circle, Ellipse, Rectangle, Polygon, Star, Arc, Sector } from '@retikz/standard-react/shape';
import { StandardInputEmbedAdapters } from '@retikz/standard-vanilla';
import { shape } from '@retikz/standard-vanilla/shape';
import { normalizeScene, scene } from '@retikz/vanilla';
import { expect, it } from 'vitest';

import * as rootEntry from '../src';
import { synchronousAdapters } from './helpers/synchronous-adapters';

it('通过 Path 编写便利，在适配器之间保持整个系列的等效性', () => {
  const visual = {
    style: { strokeWidth: 2 },
    arrow: '->' as const,
    scale: 1.5,
    meta: { origin: 'author' },
    label: { text: 'shape' },
  };
  const input = createInputScene(
    <>
      <Ellipse id="e" center="origin" radius={{ x: 20, y: 10 }} {...visual} />
      <Rectangle id="r" corner1="origin" corner2={[40, 20]} {...visual} />
      <Polygon id="p" center={[0, 0]} sides={5} radius={20} {...visual} />
      <Star id="s" center={[0, 0]} points={5} outerRadius={20} {...visual} />
      <Arc id="a" center="origin" radius={20} startAngle={0} endAngle={90} {...visual} />
      <Sector id="w" center={[0, 0]} radius={20} innerRadius={10} startAngle={0} endAngle={90} {...visual} />
    </>,
  );
  const react = normalizeScene(input.scene, { adapters: synchronousAdapters(input.adapters) });
  const vanilla = normalizeScene(
    scene({
      children: [
        shape.ellipse({ id: 'e', center: 'origin', radius: { x: 20, y: 10 }, ...visual }),
        shape.rectangle({ id: 'r', corner1: 'origin', corner2: [40, 20], ...visual }),
        shape.polygon({ id: 'p', center: [0, 0], sides: 5, radius: 20, ...visual }),
        shape.star({ id: 's', center: [0, 0], points: 5, outerRadius: 20, ...visual }),
        shape.arc({ id: 'a', center: 'origin', radius: 20, startAngle: 0, endAngle: 90, ...visual }),
        shape.sector({ id: 'w', center: [0, 0], radius: 20, innerRadius: 10, startAngle: 0, endAngle: 90, ...visual }),
      ],
    }),
    { adapters: StandardInputEmbedAdapters },
  );

  expect(react.ir).toEqual(vanilla.ir);
  expect(react.contributions).toEqual(vanilla.contributions);
  expect(react.ir.children[0]).toMatchObject({
    style: { strokeWidth: 2 },
    arrow: { end: {} },
  });
});

it('在 React 和 Vanilla 之间共享 Circle Source 和提供者贡献', () => {
  const input = createInputScene(<Circle id="c1" center="origin" radius={20} />);
  const react = normalizeScene(input.scene, { adapters: synchronousAdapters(input.adapters) });
  const vanilla = normalizeScene(scene({ children: [shape.circle({ id: 'c1', center: 'origin', radius: 20 })] }), {
    adapters: StandardInputEmbedAdapters,
  });

  expect(react.ir.children).toEqual(vanilla.ir.children);
  expect(react.contributions).toEqual(vanilla.contributions);
});

it('当 React 省略编写 ID 时，不会保留生成的实例 ID', () => {
  const input = createInputScene(<Circle center={[0, 0]} radius={20} />);
  const result = normalizeScene(input.scene, { adapters: synchronousAdapters(input.adapters) });

  expect(result.ir.children[0]).not.toHaveProperty('id');
});

it('使形状族远离根条目', () => {
  expect(rootEntry).not.toHaveProperty('Circle');
});
