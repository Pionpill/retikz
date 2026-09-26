import { describe, expect, it } from 'vitest';

import type { CompileWarning, IRChild } from '../../src';
import { compileToScene, CompileWarningCode, NodeSchema } from '../../src';

const node = (id = 'primary', aliasIds = ['alternate']) =>
  NodeSchema.parse({ type: 'node', id, aliasIds, position: [30, 40], text: 'one' });
const compile = (children: Array<IRChild>) =>
  compileToScene({ type: 'scene', version: 1, children }, { artifacts: { nodeLayouts: true } });
const path = (id: string): IRChild => ({
  type: 'path',
  children: [
    { type: 'step', kind: 'move', to: [0, 0] },
    { type: 'step', kind: 'line', to: { id, anchor: 'right' } },
  ],
});

describe('Node query aliases', () => {
  it('keeps cross-node collisions last-wins and aliases isolated by local namespaces', () => {
    const warnings: Array<CompileWarning> = [];
    const first = { ...node('first', []), position: [0, 0] as [number, number] };
    const second = node('second', ['first']);
    const result = compileToScene(
      { type: 'scene', version: 1, children: [first, second, path('first')] },
      { onWarn: warning => warnings.push(warning) },
    );
    expect(warnings.filter(warning => warning.code === CompileWarningCode.DuplicateNodeId)).toHaveLength(1);
    expect(result.scene).toEqual(compile([first, second, path('second')]).scene);
    const isolatedWarnings: Array<CompileWarning> = [];
    compileToScene(
      {
        type: 'scene',
        version: 1,
        children: [{ type: 'scope', localNamespace: true, children: [node()] }, path('alternate')],
      },
      { onWarn: warning => isolatedWarnings.push(warning) },
    );
    expect(isolatedWarnings.some(warning => warning.message.includes("'alternate'"))).toBe(true);
  });
  it('preserves JSON aliases and rejects missing primary ids or repeated names', () => {
    expect(NodeSchema.parse(JSON.parse(JSON.stringify(node())))).toEqual(node());
    for (const input of [
      { aliasIds: ['alternate'] },
      { id: 'primary', aliasIds: ['primary'] },
      { id: 'primary', aliasIds: ['a', 'a'] },
      { id: 'primary', aliasIds: [' '] },
    ])
      expect(NodeSchema.safeParse({ type: 'node', position: [0, 0], ...input }).success).toBe(false);
  });

  it('resolves delayed references through either id without duplicating Scene or layout artifacts', () => {
    expect(compile([path('alternate'), node()])).toEqual(compile([path('primary'), node()]));
    const withAlias = compile([node()]);
    const withoutAlias = compile([NodeSchema.parse({ type: 'node', id: 'primary', position: [30, 40], text: 'one' })]);
    expect(withAlias).toEqual(withoutAlias);
  });

  it('keeps alias lookup inside transformed local namespaces', () => {
    const scoped = (id: string): IRChild => ({
      type: 'scope',
      localNamespace: true,
      transforms: [
        { kind: 'translate', x: 50, y: -20 },
        { kind: 'scale', x: 2, y: 3 },
      ],
      children: [path(id), node()],
    });
    expect(compile([scoped('alternate')])).toEqual(compile([scoped('primary')]));
  });
});
