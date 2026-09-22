import { createInputScene } from '@retikz/react';
import { Circle, Ellipse, Rectangle, RegularPolygon, Star, Arc, Sector } from '@retikz/standard-react/shape';
import { StandardInputEmbedAdapters } from '@retikz/standard-vanilla';
import { shape } from '@retikz/standard-vanilla/shape';
import { normalizeScene, scene } from '@retikz/vanilla';
import { expect, it } from 'vitest';

import * as rootEntry from '../src';

it('keeps the complete family equivalent across adapters with Path authoring conveniences', () => {
  const visual = {
    thickness: 'thick' as const,
    arrow: '->' as const,
    scale: 1.5,
    meta: { origin: 'author' },
    label: { text: 'shape' },
  };
  const input = createInputScene(
    <>
      <Ellipse id="e" center="origin" radius={{ x: 20, y: 10 }} {...visual} />
      <Rectangle id="r" corner1="origin" corner2={[40, 20]} {...visual} />
      <RegularPolygon id="p" center={[0, 0]} sides={5} radius={20} {...visual} />
      <Star id="s" center={[0, 0]} points={5} outerRadius={20} {...visual} />
      <Arc id="a" center="origin" radius={20} startAngle={0} endAngle={90} {...visual} />
      <Sector id="w" center={[0, 0]} radius={20} innerRadius={10} startAngle={0} endAngle={90} {...visual} />
    </>,
  );
  const react = normalizeScene(input.scene, { adapters: input.adapters });
  const vanilla = normalizeScene(
    scene({
      children: [
        shape.ellipse({ id: 'e', center: 'origin', radius: { x: 20, y: 10 }, ...visual }),
        shape.rectangle({ id: 'r', corner1: 'origin', corner2: [40, 20], ...visual }),
        shape.regularPolygon({ id: 'p', center: [0, 0], sides: 5, radius: 20, ...visual }),
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
    marks: [{ pos: 1, mark: { kind: 'arrow' } }],
  });
});

it('shares the Circle Source and provider contribution across React and Vanilla', () => {
  const input = createInputScene(<Circle id="c1" center="origin" radius={20} />);
  const react = normalizeScene(input.scene, { adapters: input.adapters });
  const vanilla = normalizeScene(scene({ children: [shape.circle({ id: 'c1', center: 'origin', radius: 20 })] }), {
    adapters: StandardInputEmbedAdapters,
  });
  expect(react.ir.children).toEqual(vanilla.ir.children);
  expect(react.contributions).toEqual(vanilla.contributions);
});

it('does not persist a generated occurrence id when React omits the authored id', () => {
  const input = createInputScene(<Circle center={[0, 0]} radius={20} />);
  const result = normalizeScene(input.scene, { adapters: input.adapters });
  expect(result.ir.children[0]).not.toHaveProperty('id');
});

it('keeps the shape family out of the root entry', () => {
  expect(rootEntry).not.toHaveProperty('Circle');
});
