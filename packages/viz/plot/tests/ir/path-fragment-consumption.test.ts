import { describe, expect, it } from 'vitest';

import { RelationMarkSchema, RelationPathGeometrySchema, RelationPathSpecificOptionsSchema } from '../../src';

const options = {
  dashPattern: [4, 2],
  fillRule: 'evenodd' as const,
  lineCap: 'round' as const,
  lineJoin: 'bevel' as const,
  roundedCorners: 2,
  rotate: 15,
  scale: 1.25,
  marks: [{ pos: 0.5, mark: { kind: 'arrow' as const, shape: 'stealth' } }],
};

describe('Plot atomic path fragment consumption', () => {
  it('keeps relation path options field set and strict behavior', () => {
    expect(RelationPathSpecificOptionsSchema.parse(options)).toEqual(options);
    expect(RelationPathSpecificOptionsSchema.safeParse({ dashOffset: 1 }).success).toBe(false);
    expect(RelationPathSpecificOptionsSchema.safeParse({ ...options, kind: 'stroke' }).success).toBe(false);
    expect(RelationPathSpecificOptionsSchema.safeParse({ ...options, label: { text: 'edge' } }).success).toBe(false);
  });

  it('accepts fragment options in RelationPathGeometry and relation mark IR', () => {
    const geometry = RelationPathGeometrySchema.parse({ options });
    expect(geometry.options).toEqual(options);

    const relation = RelationMarkSchema.parse({
      type: 'relation',
      source: { id: 'source' },
      target: { id: 'target' },
      path: { options },
    });
    expect(relation.path?.options).toEqual(options);
  });

  it('keeps relation path fragment input JSON round-trippable', () => {
    const restored = RelationPathSpecificOptionsSchema.parse(JSON.parse(JSON.stringify(options)));
    expect(restored).toEqual(options);
  });
});
