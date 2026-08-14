import type { AnyCompositeDefinition, IRChild, IRNode, ScenePrimitive } from '@retikz/core';

import { compileToScene, lowerIRToKernel, ThemeMode } from '@retikz/core';
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

const flattenPrimitives = (primitives: ReadonlyArray<ScenePrimitive>): Array<ScenePrimitive> =>
  primitives.flatMap(primitive =>
    primitive.type === 'group' ? [primitive, ...flattenPrimitives(primitive.children)] : [primitive],
  );

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

  it('preserves geometry defaults while leaving Theme paints absent from canonical semantic IR', () => {
    const terminal = Notation.createTerminal({ id: 'terminal', position });
    const stage = Notation.createStage({ id: 'stage', position });
    const decision = Notation.createDecision({ id: 'decision', position });
    const junction = Notation.createJunction({ id: 'junction', position });

    expect(terminal).toMatchObject({
      namespace: 'notation',
      type: 'terminal',
      minimumSize: { width: 48, height: 24 },
      padding: { x: 12, y: 6 },
    });
    expect(stage).toMatchObject({
      namespace: 'notation',
      type: 'stage',
      padding: 8,
    });
    expect(decision).toMatchObject({
      namespace: 'notation',
      type: 'decision',
      padding: { x: 3, y: 2 },
    });
    expect(junction).toMatchObject({
      namespace: 'notation',
      type: 'junction',
      minimumSize: { width: 8, height: 8 },
      padding: 0,
    });
    [terminal, stage, decision, junction].forEach(unit => {
      expect(unit).not.toHaveProperty('shape');
      expect(unit).not.toHaveProperty('textColor');
      expect(unit).not.toHaveProperty('stroke');
      expect(unit).not.toHaveProperty('fill');
      expect(unit).not.toHaveProperty('opacity');
      expect(unit).not.toHaveProperty('fillOpacity');
      expect(unit).not.toHaveProperty('strokeOpacity');
    });
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

  it.each([
    ['default', ThemeMode.Light, '#000000', { textColor: '#000000', stroke: '#000000', fill: 'none' }],
    ['default', ThemeMode.Dark, '#ffffff', { textColor: '#ffffff', stroke: '#ffffff', fill: 'none' }],
    ['primary', ThemeMode.Light, '#000000', { textColor: 'contrast', stroke: '#000000', fill: '#000000' }],
    ['primary', ThemeMode.Dark, '#ffffff', { textColor: 'contrast', stroke: '#ffffff', fill: '#ffffff' }],
    ['secondary', ThemeMode.Light, '#000000', { textColor: '#000000', stroke: 'none', fill: '#e6e6e6' }],
    ['secondary', ThemeMode.Dark, '#ffffff', { textColor: '#ffffff', stroke: 'none', fill: '#1a1a1a' }],
    ['outline', ThemeMode.Light, '#000000', { textColor: '#000000', stroke: '#666666', fill: 'none' }],
    ['outline', ThemeMode.Dark, '#ffffff', { textColor: '#ffffff', stroke: '#999999', fill: 'none' }],
    ['vibrant', ThemeMode.Light, '#000000', { textColor: '#000000', stroke: '#000000', fill: '#d9d9d9' }],
    ['vibrant', ThemeMode.Dark, '#ffffff', { textColor: '#ffffff', stroke: '#ffffff', fill: '#262626' }],
  ] as const)('applies the %s/%s LogicNodeVariant recipe', (variant, mode, color, expected) => {
    const units = [
      Notation.createTerminal({ id: 'terminal', position, variant }),
      Notation.createStage({ id: 'stage', position, variant }),
      Notation.createDecision({ id: 'decision', position, variant }),
      Notation.createJunction({ id: 'junction', position, variant }),
    ];
    const lowered = lowerIRToKernel({ ...sceneOf(units), theme: { mode } }, { composites: definitions() });

    lowered.children.forEach(child => expect(child).toMatchObject({ color, ...expected }));
  });

  it('uses authored color as the primary color for every variant recipe', () => {
    const variants = [
      ['default', { textColor: '#cc3366', stroke: '#cc3366', fill: 'none' }],
      ['primary', { textColor: 'contrast', stroke: '#cc3366', fill: '#cc3366' }],
      ['secondary', { textColor: '#cc3366', stroke: 'none', fill: '#faebf0' }],
      ['outline', { textColor: '#cc3366', stroke: '#e085a3', fill: 'none' }],
      ['vibrant', { textColor: '#cc3366', stroke: '#cc3366', fill: '#f7e0e8' }],
    ] as const;

    variants.forEach(([variant, expected]) => {
      const stage = Notation.createStage({ id: variant, position, color: '#cc3366', variant });
      const lowered = lowerIRToKernel(
        { ...sceneOf([stage]), theme: { mode: ThemeMode.Light } },
        { composites: definitions() },
      );
      expect(lowered.children[0]).toMatchObject({ color: '#cc3366', ...expected });
    });
  });

  it('uses Core contrast for primary text before Scene emission', () => {
    const stage = Notation.createStage({
      id: 'primary',
      position,
      text: 'Primary',
      color: '#cc3366',
      variant: 'primary',
    });
    const scene = compileToScene(
      { ...sceneOf([stage]), theme: { mode: ThemeMode.Light } },
      { composites: definitions() },
    ).scene;
    const primitives = flattenPrimitives(scene.primitives);

    expect(primitives.find(primitive => primitive.type === 'rect')).toMatchObject({
      fill: '#cc3366',
      stroke: '#cc3366',
    });
    expect(primitives.find(primitive => primitive.type === 'text')).toMatchObject({ fill: '#ffffff' });
  });

  it.each(['primary', 'secondary', 'outline', 'vibrant'] as const)(
    'rejects dynamic authored primary color for the %s recipe',
    variant => {
      const stage = Notation.createStage({ id: 'dynamic', position, color: 'currentColor', variant });

      expect(() => lowerIRToKernel(sceneOf([stage]), { composites: definitions() })).toThrow(
        /compositeOpaqueColor.*foreground/i,
      );
    },
  );

  it('passes explicit paints and opacity fields through independently without generating opacity', () => {
    const authored = Notation.createStage({
      id: 'authored',
      position,
      color: '#cc3366',
      textColor: 'transparent',
      stroke: 'none',
      fill: 'currentColor',
      opacity: 0.8,
      fillOpacity: 0.7,
      strokeOpacity: 0.6,
    });
    const textOnly = Notation.createStage({
      id: 'text-only',
      position: [60, 0],
      color: '#cc3366',
      textColor: 'transparent',
    });
    const strokeOnly = Notation.createStage({
      id: 'stroke-only',
      position: [120, 0],
      color: '#cc3366',
      stroke: 'none',
    });
    const fillOnly = Notation.createStage({
      id: 'fill-only',
      position: [180, 0],
      color: '#cc3366',
      fill: 'currentColor',
    });
    const inherited = Notation.createStage({ id: 'inherited', position: [240, 0], color: '#cc3366' });
    const lowered = lowerIRToKernel(sceneOf([authored, textOnly, strokeOnly, fillOnly, inherited]), {
      composites: definitions(),
    });
    const baseline = { color: '#cc3366', textColor: '#cc3366', stroke: '#cc3366', fill: 'none' };

    expect(lowered.children[0]).toMatchObject({
      textColor: 'transparent',
      stroke: 'none',
      fill: 'currentColor',
      opacity: 0.8,
      fillOpacity: 0.7,
      strokeOpacity: 0.6,
    });
    expect(lowered.children[1]).toMatchObject({ ...baseline, textColor: 'transparent' });
    expect(lowered.children[2]).toMatchObject({ ...baseline, stroke: 'none' });
    expect(lowered.children[3]).toMatchObject({ ...baseline, fill: 'currentColor' });
    expect(lowered.children[4]).toMatchObject(baseline);
    lowered.children.slice(1).forEach(child => {
      expect(child).not.toHaveProperty('opacity');
      expect(child).not.toHaveProperty('fillOpacity');
      expect(child).not.toHaveProperty('strokeOpacity');
    });
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
