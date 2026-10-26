import { describe, expect, it } from 'vitest';

import { RelationMarkSchema, RelationPathGeometrySchema, RelationPathSpecificOptionsSchema } from '../../src';

const options = {
  style: { dashPattern: [4, 2], fillRule: 'evenodd' as const, lineCap: 'round' as const, lineJoin: 'bevel' as const },
  cornerRadius: 2,
  rotate: 15,
  scale: 1.25,
  marks: [{ pos: 0.5, shape: 'stealth' }],
};

describe('Plot 原子路径片段的消费', () => {
  it('保持关系路径选项字段设置和严格行为', () => {
    expect(RelationPathSpecificOptionsSchema.parse(options)).toEqual(options);
    expect(RelationPathSpecificOptionsSchema.safeParse({ style: { dashOffset: 1 } }).success).toBe(false);
    expect(RelationPathSpecificOptionsSchema.safeParse({ ...options, kind: 'stroke' }).success).toBe(false);
    expect(RelationPathSpecificOptionsSchema.safeParse({ ...options, label: { text: 'edge' } }).success).toBe(false);
  });

  it('接受 RelationPathGeometry 和关系标记 IR 中的片段选项', () => {
    const geometry = RelationPathGeometrySchema.parse({ options });

    expect(geometry.options).toEqual(options);

    const relation = RelationMarkSchema.parse({
      type: 'relation',
      properties: {
        source: { anchorId: { template: 'source' } },
        target: { anchorId: { template: 'target' } },
        geometry: { kind: 'path', options },
      },
    });

    expect(relation.properties.geometry.options).toEqual(options);
  });

  it('保持关系路径片段输入 JSON 可往返', () => {
    const restored = RelationPathSpecificOptionsSchema.parse(JSON.parse(JSON.stringify(options)));

    expect(restored).toEqual(options);
  });
});
