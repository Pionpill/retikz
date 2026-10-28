import { describe, expect, it } from 'vitest';
import { literal } from 'zod';

import * as Graph from '../../src';

describe('代码内容 Source 契约', () => {
  it('往返订购共享事实，而无需具体化演示或默认值', () => {
    const method = {
      id: 'find',
      name: 'find',
      signature: { parameters: [{ name: 'id', typeText: 'string' }] },
      logic: { body: { kind: 'steps', steps: ['Read', 'Return'] } },
    };

    expect(Graph.CodeMethodSchema.parse(JSON.parse(JSON.stringify(method)))).toEqual(method);
    expect(Graph.CodeSignatureSchema.parse({})).toEqual({});
    expect(Graph.CodeSignatureSchema.parse({ parameters: [] })).toEqual({ parameters: [] });
    expect(Graph.CodePropertySchema.parse({ name: 'value' })).toEqual({ name: 'value' });
  });

  it.each([
    { body: { kind: 'steps', steps: [] } },
    { body: { kind: 'steps', steps: [''] } },
    { body: { kind: 'text', text: '' } },
    { body: { kind: 'text', text: 'Read', steps: ['Read'] } },
  ])('拒绝无效逻辑 JSON：%j', value => {
    expect(Graph.CodeLogicSchema.safeParse(value).success).toBe(false);
  });

  it('在组成实体时保留完整的 Block 表面及其宽度约束', () => {
    const schema = Graph.CodeBlockPropsSchema.safeExtend({ namespace: literal('test'), type: literal('service') });
    const source = {
      namespace: 'test',
      type: 'service',
      name: 'Service',
      id: 'service',
      width: 200,
      minWidth: 100,
      icon: null,
      trail: { type: 'node', position: [0, 0], text: 'service' },
      localNamespace: true,
    };

    expect(schema.parse(source)).toEqual({ ...source, position: [0, 0] });
    expect(schema.safeParse({ ...source, minWidth: 201 }).success).toBe(false);

    for (const extra of [{ children: [] }, { presentation: {} }, { tokens: {} }, { name: '' }]) {
      expect(schema.safeParse({ ...source, ...extra }).success).toBe(false);
    }
  });
});
