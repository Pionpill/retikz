import type { IRNode, IRScene } from '@retikz/core';
import { CompositeBaseSchema, defineComposite } from '@retikz/core';
import { describe, expect, it } from 'vitest';
import { literal } from 'zod';

import { WeaveManager } from '../../src/weave';
import { compileTestSnapshot } from '../helpers/compilation';

describe('Composite 增量贡献', () => {
  it('独立更新复用已物化贡献，引用变化重建实例，候选回滚保留旧贡献', () => {
    let calls = 0;
    const definition = defineComposite({
      namespace: 'test',
      type: 'drawing',
      schema: CompositeBaseSchema.extend({ namespace: literal('test'), type: literal('drawing') }),
      compile: () => {
        calls++;
        return {
          children: [
            { type: 'node', id: 'generated', position: [10, 0], text: 'cached' },
            {
              type: 'path',
              children: [
                { type: 'step', kind: 'move', to: { id: 'generated' } },
                { type: 'step', kind: 'line', to: { id: 'anchor' } },
              ],
            },
          ],
        };
      },
    });
    const anchor: IRNode = { type: 'node', id: 'anchor', position: [100, 0] };
    const other: IRNode = { type: 'node', id: 'other', position: [200, 0] };
    const source: IRScene = {
      type: 'scene',
      version: 1,
      children: [
        anchor,
        { namespace: 'test', type: 'drawing' },
        other,
        { type: 'coordinate', id: 'consumer', position: { direction: 'right', of: 'generated' } },
      ],
    };
    const options = { composites: [definition] };
    const execution = { captureProvenance: true };
    const session = new WeaveManager(source, options, execution);
    const initial = session.mount();
    const snapshot = structuredClone(initial.compilation.result);
    const changedOther: IRNode = { ...other, position: [250, 20] };
    const independent = session.update({
      operations: [
        { kind: 'update', target: { kind: 'id', scopeId: initial.root.scopeId, id: 'other' }, input: changedOther },
      ],
    });
    expect(calls).toBe(1);
    expect(independent.compilation).toEqual(
      compileTestSnapshot(
        { ...source, children: [anchor, source.children[1], changedOther, source.children[3]] },
        options,
        execution,
      ),
    );
    independent.commit();
    independent.finish();
    const beforeChangedDependency = calls;
    const changedAnchor: IRNode = { ...anchor, position: [150, 50] };
    const changed = session.update({
      operations: [
        { kind: 'update', target: { kind: 'id', scopeId: initial.root.scopeId, id: 'anchor' }, input: changedAnchor },
      ],
    });
    expect(calls).toBe(beforeChangedDependency + 1);
    expect(changed.compilation).toEqual(
      compileTestSnapshot(
        { ...source, children: [changedAnchor, source.children[1], changedOther, source.children[3]] },
        options,
        execution,
      ),
    );
    changed.rollback();
    const beforeRetry = calls;
    const retry = session.update({
      operations: [
        { kind: 'update', target: { kind: 'id', scopeId: initial.root.scopeId, id: 'other' }, input: other },
      ],
    });
    expect(calls).toBe(beforeRetry);
    expect(retry.compilation.result).toEqual(snapshot);
    expect(initial.compilation.result).toEqual(snapshot);
    retry.rollback();
  });
});
