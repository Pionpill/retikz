import type { AnyCompositeDefinition, IRChild, LayoutChildResult, LayoutProposal } from '@retikz/core';
import { ChildSchema, compileToScene, CompositeBaseSchema, defineComposite, LayoutChildProbeKind } from '@retikz/core';
import { pathClipDefinition } from '@retikz/extension';
import { intrinsicLayoutProposal } from '@retikz/layout/compose';
import { describe, expect, it } from 'vitest';
import { literal } from 'zod';

import { arrayDefinition, mapDefinition, matrixDefinition } from '../../../src/collection';
import { sceneCellBounds } from '../../helpers/scene-geometry';

const compile = (
  child: IRChild,
  proposal: LayoutProposal = intrinsicLayoutProposal('natural'),
  extra: Array<AnyCompositeDefinition> = [],
) => {
  let observed: LayoutChildResult | undefined;
  const harness = defineComposite({
    namespace: 'cell-test',
    type: 'harness',
    schema: CompositeBaseSchema.extend({
      namespace: literal('cell-test'),
      type: literal('harness'),
      child: ChildSchema,
    }),
    compile: (node, context) => {
      const probe = context.layoutChild(node.child, proposal);
      if (probe.kind === LayoutChildProbeKind.Failed) return context.raise(probe.failure);

      observed = probe.result;

      return { children: [context.replay(probe.result)] };
    },
  });
  const scene = compileToScene(
    { type: 'scene', version: 1, children: [{ namespace: 'cell-test', type: 'harness', child }] },
    {
      composites: [harness, arrayDefinition, mapDefinition, matrixDefinition, ...extra],
      clips: [pathClipDefinition],
      padding: 0,
    },
  );
  if (observed === undefined) throw new Error('No layout result');

  return { scene, observed };
};

describe('Matrix 父分配', () => {
  const source = {
    namespace: 'standard',
    type: 'matrix',
    id: 'm',
    cellIdMode: 'index',
    skeleton: { rows: 2, columns: 2 },
    layout: { gap: 2 },
    defaultCell: { layout: { width: 30, height: 20 } },
  };
  it('当父级提供剩余空间时保持单元格大小', () => {
    const result = compile(source, { x: { kind: 'exact', value: 100 }, y: { kind: 'range', min: 80, max: 100 } });

    expect(result.observed.allocationBounds).toEqual({ x: 0, y: 0, width: 100, height: 80 });
    expect(sceneCellBounds(result.scene.scene)).toEqual([
      { x: 0, y: 0, width: 30, height: 20 },
      { x: 32, y: 0, width: 30, height: 20 },
      { x: 0, y: 22, width: 30, height: 20 },
      { x: 32, y: 22, width: 30, height: 20 },
    ]);
  });

  it('拒绝小于所需轨道的父轨道', () => {
    expect(() => compile(source, { x: { kind: 'exact', value: 20 }, y: { kind: 'exact', value: 80 } })).toThrow();
  });
});
