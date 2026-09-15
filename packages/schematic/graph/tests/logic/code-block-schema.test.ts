import { describe, expect, it } from 'vitest';
import { literal } from 'zod';

import * as Graph from '../../src';

describe('Code content Source contracts', () => {
  it('round-trips ordered shared facts without materializing presentation or defaults', () => {
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
  ])('rejects invalid logic JSON: %j', value => {
    expect(Graph.CodeLogicSchema.safeParse(value).success).toBe(false);
  });
  it('keeps the full Block surface and its width constraint when composing an entity', () => {
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
    expect(schema.parse(source)).toEqual(source);
    expect(schema.safeParse({ ...source, minWidth: 201 }).success).toBe(false);
    for (const extra of [{ children: [] }, { presentation: {} }, { tokens: {} }, { name: '' }]) {
      expect(schema.safeParse({ ...source, ...extra }).success).toBe(false);
    }
  });
});
