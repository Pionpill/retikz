import type { AnyCompositeDefinition, IRChild, IRNode } from '@retikz/core';

import { lowerIRToKernel } from '@retikz/core';
import { describe, expect, expectTypeOf, it } from 'vitest';

import type { IRDecision, IRJunction, IRStage, IRTerminal } from '../../src';

import * as Notation from '../../src';

const position = [0, 0] as const;

const sceneOf = (children: ReadonlyArray<IRChild>): { version: 1; type: 'scene'; children: Array<IRChild> } => ({
  version: 1,
  type: 'scene',
  children: Array.from(children),
});

const definitions = (): Array<AnyCompositeDefinition> => [
  Notation.TerminalDefinition,
  Notation.StageDefinition,
  Notation.DecisionDefinition,
  Notation.JunctionDefinition,
];

describe('Notation semantic unit canonical IR', () => {
  it('keeps a distinct Notation discriminator and authored identity for every unit', () => {
    const terminal = Notation.createTerminal({ id: 'terminal', position });
    const stage = Notation.createStage({ id: 'stage', position });
    const decision = Notation.createDecision({ id: 'decision', position });
    const junction = Notation.createJunction({ id: 'junction', position });

    expect([terminal, stage, decision, junction]).toMatchObject([
      { namespace: 'notation', type: 'terminal', id: 'terminal' },
      { namespace: 'notation', type: 'stage', id: 'stage' },
      { namespace: 'notation', type: 'decision', id: 'decision' },
      { namespace: 'notation', type: 'junction', id: 'junction' },
    ]);
    expect(Notation.TerminalSchema.parse(JSON.parse(JSON.stringify(terminal)))).toEqual(terminal);
    expect(Notation.StageSchema.parse(JSON.parse(JSON.stringify(stage)))).toEqual(stage);
    expect(Notation.DecisionSchema.parse(JSON.parse(JSON.stringify(decision)))).toEqual(decision);
    expect(Notation.JunctionSchema.parse(JSON.parse(JSON.stringify(junction)))).toEqual(junction);
    expectTypeOf(terminal).toEqualTypeOf<IRTerminal>();
    expectTypeOf(stage).toEqualTypeOf<IRStage>();
    expectTypeOf(decision).toEqualTypeOf<IRDecision>();
    expectTypeOf(junction).toEqualTypeOf<IRJunction>();
  });

  it('rejects Core type and authored shape fields from canonical semantic IR', () => {
    expect(Notation.StageSchema.safeParse({ namespace: 'notation', type: 'node', id: 'stage', position }).success).toBe(
      false,
    );
    expect(
      Notation.StageSchema.safeParse({
        namespace: 'notation',
        type: 'stage',
        id: 'stage',
        position,
        shape: 'circle',
      }).success,
    ).toBe(false);
  });

  it('preserves existing defaults in canonical semantic IR without persisting fixed shapes', () => {
    expect(Notation.createTerminal({ id: 'terminal', position })).toMatchObject({
      namespace: 'notation',
      type: 'terminal',
      minimumSize: { width: 48, height: 24 },
      padding: { x: 12, y: 6 },
      fill: 'transparent',
    });
    expect(Notation.createStage({ id: 'stage', position })).toMatchObject({
      namespace: 'notation',
      type: 'stage',
      padding: 8,
      fill: 'transparent',
    });
    expect(Notation.createDecision({ id: 'decision', position })).toMatchObject({
      namespace: 'notation',
      type: 'decision',
      padding: { x: 3, y: 2 },
      fill: 'transparent',
    });
    expect(Notation.createJunction({ id: 'junction', position })).toMatchObject({
      namespace: 'notation',
      type: 'junction',
      minimumSize: { width: 8, height: 8 },
      padding: 0,
      fill: 'currentColor',
    });
    expect(Notation.createTerminal({ id: 'terminal', position })).not.toHaveProperty('shape');
    expect(Notation.createStage({ id: 'stage', position })).not.toHaveProperty('shape');
  });
});

describe('Notation semantic unit Node lowering', () => {
  it('expands every semantic unit to exactly one same-id Core Node with its fixed shape', () => {
    const canonical = [
      Notation.createTerminal({ id: 'terminal', position }),
      Notation.createStage({ id: 'stage', position: [60, 0] }),
      Notation.createDecision({ id: 'decision', position: [120, 0] }),
      Notation.createJunction({ id: 'junction', position: [180, 0] }),
    ];
    const lowered = lowerIRToKernel(sceneOf(canonical), { composites: definitions() });

    expect(lowered.children).toHaveLength(4);
    expect(lowered.children).toMatchObject([
      { type: 'node', id: 'terminal', shape: { type: 'rectangle', params: { cornerRadius: 1_000_000 } } },
      { type: 'node', id: 'stage', shape: { type: 'rectangle', params: { cornerRadius: 8 } } },
      { type: 'node', id: 'decision', shape: { type: 'diamond', params: { aspectRatio: 1.8 } } },
      { type: 'node', id: 'junction', shape: 'circle' },
    ]);
  });

  it('passes the complete applicable Node surface through the Definition', () => {
    const stage = Notation.createStage({
      id: 'surface',
      position: [10, 20],
      text: 'Process',
      label: { text: 'label', position: 'top' },
      fill: '#f8fafc',
      stroke: '#334155',
      strokeWidth: 2,
      rotate: 12,
      scale: { x: 1.2, y: 0.8 },
      meta: { role: 'surface' },
      animations: [
        {
          property: 'opacity',
          keyframes: [
            { at: 0, value: 0 },
            { at: 1, value: 1 },
          ],
          duration: 400,
          trigger: 'load',
        },
      ],
      zIndex: 4,
    });
    const lowered = lowerIRToKernel(sceneOf([stage]), { composites: definitions() }).children[0];

    expect(lowered).toMatchObject({
      type: 'node',
      id: 'surface',
      position: [10, 20],
      text: 'Process',
      label: { text: 'label', position: 'top' },
      fill: '#f8fafc',
      stroke: '#334155',
      strokeWidth: 2,
      rotate: 12,
      scale: { x: 1.2, y: 0.8 },
      meta: { role: 'surface' },
      animations: [
        {
          property: 'opacity',
          keyframes: [
            { at: 0, value: 0 },
            { at: 1, value: 1 },
          ],
          duration: 400,
          trigger: 'load',
        },
      ],
      zIndex: 4,
    } satisfies Partial<IRNode>);
  });

  it('registers lightweight expansion Definitions without typed artifacts', () => {
    definitions().forEach(definition => {
      expect(definition).toMatchObject({ namespace: 'notation' });
      expect(definition.expand).toEqual(expect.any(Function));
      expect(definition.compile).toBeUndefined();
      expect(definition.artifactSchema).toBeUndefined();
    });
  });

  it('uses the Core unregistered-composite diagnostic when a Definition is omitted', () => {
    const stage = Notation.createStage({ id: 'missing-definition', position });

    expect(() => lowerIRToKernel(sceneOf([stage]), { composites: [] })).toThrow(/notation\.stage.*not registered/i);
  });
});
