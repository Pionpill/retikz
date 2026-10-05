import { describe, expect, it } from 'vitest';

import { RelationSchema } from '../../src';

describe('Relation visual contract', () => {
  it('preserves effects and zero overrides while rejecting fill fields', () => {
    const source = {
      namespace: 'graph',
      type: 'relation',
      role: 'association',
      source: { id: 'a' },
      target: { id: 'b' },
      style: { stroke: 0, opacity: 0, strokeWidth: 0, shadow: 'sm', blendMode: 'multiply', lineJoin: 'bevel' },
      roundedCorners: 0,
      rotate: -30,
      scale: { x: 2, y: 1 },
    };

    expect(RelationSchema.parse(JSON.parse(JSON.stringify(source)))).toEqual(source);

    for (const [field, value] of Object.entries({ fill: 'red', fillOpacity: 0.3, fillRule: 'evenodd' })) {
      const result = RelationSchema.safeParse({ ...source, style: { ...source.style, [field]: value } });

      expect(result.success).toBe(false);

      if (!result.success) expect(result.error.issues[0]?.path).toEqual(['style']);
    }
  });
});
