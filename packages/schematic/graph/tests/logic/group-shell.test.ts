import type { IRChild, LayoutCompositeCompileContext } from '@retikz/core';
import type { BoundsInsets, BoundsRect } from '@retikz/math';

import { compileToScene, CompositeBaseSchema, defineComposite, defineThemeStyle } from '@retikz/core';
import { NonNegativeNumberSchema } from '@retikz/foundation';
import { describe, expect, it } from 'vitest';
import { literal, strictObject } from 'zod';

import type { GraphDefinitionOptions, IRGroup } from '../../src';

import * as Graph from '../../src';
import { compileInHarness, naturalProposal, primitivesOf } from './test-utils';

type GroupShellMetrics = Readonly<{
  minimumSize: Readonly<Pick<BoundsRect, 'width' | 'height'>>;
  contentInsets: Readonly<BoundsInsets>;
}>;

type MeasureGroupShell = (
  source: IRGroup,
  context: LayoutCompositeCompileContext,
  options?: GraphDefinitionOptions,
) => GroupShellMetrics;

type CreateGroupBodyAllocation = (bounds: Readonly<BoundsRect>) => IRChild;

const isMeasureGroupShell = (value: unknown): value is MeasureGroupShell => typeof value === 'function';
const isCreateGroupBodyAllocation = (value: unknown): value is CreateGroupBodyAllocation => typeof value === 'function';

const metricSchema = strictObject({
  minimumSize: strictObject({ width: NonNegativeNumberSchema, height: NonNegativeNumberSchema }),
  contentInsets: strictObject({
    top: NonNegativeNumberSchema,
    right: NonNegativeNumberSchema,
    bottom: NonNegativeNumberSchema,
    left: NonNegativeNumberSchema,
  }),
});

const measurementSchema = CompositeBaseSchema.extend({
  namespace: literal('graph-shell-test'),
  type: literal('measurement'),
  group: Graph.GroupSchema,
});

const compileMeasurement = (
  group: IRGroup,
  measureGroupShell: MeasureGroupShell,
  options: GraphDefinitionOptions = {},
  themeStyle?: string,
): GroupShellMetrics => {
  const definition = defineComposite({
    namespace: 'graph-shell-test',
    type: 'measurement',
    schema: measurementSchema,
    artifactSchema: metricSchema,
    compile: (source, context) => ({ children: [], artifact: measureGroupShell(source.group, context, options) }),
  });
  const output = compileToScene(
    {
      type: 'scene',
      version: 1,
      ...(themeStyle === undefined ? {} : { theme: { style: themeStyle } }),
      children: [{ namespace: 'graph-shell-test', type: 'measurement', group }],
    },
    {
      composites: [...Graph.createGraphDefinitions(options), definition],
      ...(themeStyle === undefined
        ? {}
        : { themeStyles: [defineThemeStyle({ name: themeStyle, resolve: () => ({}) })] }),
      padding: 0,
    },
  );
  const artifact = output.artifacts.find(
    candidate =>
      candidate.kind === 'composite' && candidate.namespace === 'graph-shell-test' && candidate.type === 'measurement',
  );
  if (artifact === undefined || artifact.kind !== 'composite') throw new Error('Expected Group shell metrics');
  return metricSchema.parse(artifact.value);
};

describe('Graph Group shell composition', () => {
  it('measures caption placement and padding through one Graph-owned shell projection', () => {
    const candidate: unknown = Graph;
    const measureGroupShell =
      typeof candidate === 'object' && candidate !== null && 'measureGroupShell' in candidate
        ? candidate.measureGroupShell
        : undefined;
    expect(isMeasureGroupShell(measureGroupShell)).toBe(true);
    if (!isMeasureGroupShell(measureGroupShell)) return;

    const base = {
      padding: { top: 2, right: 3, bottom: 4, left: 5 },
      caption: { title: { text: 'Runtime' }, bodyGap: 7 },
      children: [],
    };
    const top = compileMeasurement(Graph.createGroup(base), measureGroupShell);
    const bottom = compileMeasurement(
      Graph.createGroup({ ...base, caption: { ...base.caption, side: 'bottom' } }),
      measureGroupShell,
    );

    expect(top.minimumSize).toEqual(bottom.minimumSize);
    expect(top.contentInsets.left).toBe(5);
    expect(top.contentInsets.right).toBe(3);
    expect(top.contentInsets.bottom).toBe(4);
    expect(top.contentInsets.top).toBeGreaterThan(2 + 7);
    expect(bottom.contentInsets.top).toBe(2);
    expect(bottom.contentInsets.bottom).toBeGreaterThan(4 + 7);
  });

  it('keeps Group shell metrics stable when named Theme changes appearance only', () => {
    const candidate: unknown = Graph;
    const measureGroupShell =
      typeof candidate === 'object' && candidate !== null && 'measureGroupShell' in candidate
        ? candidate.measureGroupShell
        : undefined;
    expect(isMeasureGroupShell(measureGroupShell)).toBe(true);
    if (!isMeasureGroupShell(measureGroupShell)) return;

    const group = Graph.createGroup({
      padding: { top: 3, right: 5, bottom: 7, left: 11 },
      caption: { title: { text: 'Theme stable' }, bodyGap: 13 },
      children: [],
    });
    const styleName = 'measurement-shell';
    let resolutionCount = 0;
    const style = Graph.defineGraphThemeStyle({
      name: styleName,
      resolve: () => {
        resolutionCount += 1;
        return {
          group: {
            tokens: {
              background: { fill: '#ede9fe' },
              border: { stroke: '#6d28d9', strokeWidth: 5 },
              cornerRadius: 20,
            },
          },
        };
      },
    });

    expect(compileMeasurement(group, measureGroupShell, { graphThemeStyles: [style] }, styleName)).toEqual(
      compileMeasurement(group, measureGroupShell),
    );
    expect(resolutionCount).toBe(1);
  });

  it('creates an exact allocation constraint without primitives, identity, handles or artifacts', () => {
    const candidate: unknown = Graph;
    const createGroupBodyAllocation =
      typeof candidate === 'object' && candidate !== null && 'createGroupBodyAllocation' in candidate
        ? candidate.createGroupBodyAllocation
        : undefined;
    expect(isCreateGroupBodyAllocation(createGroupBodyAllocation)).toBe(true);
    if (!isCreateGroupBodyAllocation(createGroupBodyAllocation)) return;

    const allocation = createGroupBodyAllocation({ x: 4, y: 6, width: 120, height: 80 });
    const { output, result } = compileInHarness(allocation, naturalProposal, Graph.createGraphDefinitions());

    expect(result.allocationBounds).toEqual({ x: 4, y: 6, width: 120, height: 80 });
    expect(result.slotSize).toEqual({ width: 120, height: 80 });
    expect(primitivesOf(output.scene.primitives)).toEqual([]);
    expect(output.artifacts).toEqual([]);
    expect(output.spatialHandles.entries).toEqual([]);
    expect(JSON.stringify(output)).not.toContain('group-body-allocation');
  });
});
