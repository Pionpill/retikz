import type { AnyCompositeDefinition, IRScene } from '@retikz/core';

import { compileToScene, CompositeBaseSchema, defineComposite } from '@retikz/core';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import {
  createGrid,
  createLegend,
  createStandardBundle,
  FrameModule,
  GridDefinition,
  GridModule,
  LegendModule,
} from '../../src';

const customDefinition = defineComposite({
  namespace: 'example',
  type: 'badge',
  schema: CompositeBaseSchema.extend({
    namespace: z.literal('example'),
    type: z.literal('badge'),
    text: z.string(),
  }),
  expand: node => ({ type: 'node', position: [0, 0], text: node.text }),
});

describe('createStandardBundle()', () => {
  it('returns a frozen empty bundle with required composites', () => {
    const bundle = createStandardBundle([]);
    const composites: ReadonlyArray<AnyCompositeDefinition> = bundle.compile.composites;

    expect(bundle.modules).toEqual([]);
    expect(composites).toEqual([]);
    expect(Object.isFrozen(bundle)).toBe(true);
    expect(Object.isFrozen(bundle.modules)).toBe(true);
    expect(Object.isFrozen(bundle.compile)).toBe(true);
    expect(Object.isFrozen(composites)).toBe(true);
  });

  it('preserves module and definition declaration order without changing inputs', () => {
    const modules = [FrameModule, GridModule];
    const bundle = createStandardBundle(modules);

    expect(bundle.modules).toEqual(['standard.frame', 'standard.grid']);
    expect(bundle.compile.composites).toEqual([FrameModule.composites[0], GridDefinition]);
    expect(modules).toEqual([FrameModule, GridModule]);
    expect(Object.isFrozen(modules)).toBe(false);
  });

  it('freezes official module containers without freezing definitions', () => {
    expect(Object.isFrozen(GridModule)).toBe(true);
    expect(Object.isFrozen(GridModule.composites)).toBe(true);
    expect(Object.isFrozen(GridDefinition)).toBe(false);
  });

  it('merges repeated references to the same module at their first position', () => {
    const bundle = createStandardBundle([GridModule, GridModule, FrameModule, GridModule]);

    expect(bundle.modules).toEqual(['standard.grid', 'standard.frame']);
    expect(bundle.compile.composites).toEqual([GridDefinition, FrameModule.composites[0]]);
  });

  it('rejects empty names and different module objects that share a name', () => {
    expect(() => createStandardBundle([{ name: '   ', composites: [] }])).toThrow(/non-empty/i);
    expect(() =>
      createStandardBundle([
        { name: 'example.module', composites: [] },
        { name: 'example.module', composites: [] },
      ]),
    ).toThrow(/duplicate standard capability module name.*example\.module/i);
  });

  it('accepts a third-party structural module through the Core composite path', () => {
    const composites = [customDefinition];
    const module = { name: 'example.badge', composites };
    const bundle = createStandardBundle([module]);
    const scene: IRScene = {
      type: 'scene',
      version: 1,
      children: [{ namespace: 'example', type: 'badge', text: 'Custom' }],
    };

    expect(() => compileToScene(scene, bundle.compile)).not.toThrow();
    expect(bundle.modules).toEqual(['example.badge']);
    expect(bundle.compile.composites).toEqual([customDefinition]);
    expect(Object.isFrozen(module)).toBe(false);
    expect(Object.isFrozen(composites)).toBe(false);
    expect(Object.isFrozen(customDefinition)).toBe(false);
  });

  it('leaves duplicate composite keys for Core to diagnose', () => {
    const bundle = createStandardBundle([
      { name: 'example.first', composites: [customDefinition] },
      { name: 'example.second', composites: [customDefinition] },
    ]);
    const scene: IRScene = { type: 'scene', version: 1, children: [] };

    expect(bundle.compile.composites).toEqual([customDefinition, customDefinition]);
    expect(() => compileToScene(scene, bundle.compile)).toThrow(/duplicate composite registration.*example\.badge/i);
  });

  it('compiles selected Standard IR equivalently to direct definitions', () => {
    const ir: IRScene = {
      type: 'scene',
      version: 1,
      children: [createGrid({ bounds: { min: [0, 0], max: [10, 10] }, spacing: 10 })],
    };

    expect(compileToScene(ir, createStandardBundle([GridModule]).compile)).toEqual(
      compileToScene(ir, { composites: [GridDefinition] }),
    );
  });

  it('compiles Legend through its module without implicitly collecting sample capabilities', () => {
    const primitiveLegend = createLegend({
      content: {
        kind: 'items',
        items: [{ key: 'node', sample: { type: 'node', position: [0, 0], text: 'Node' } }],
      },
    });
    const customLegend = createLegend({
      content: {
        kind: 'items',
        items: [{ key: 'custom', sample: { namespace: 'example', type: 'badge', text: 'Custom' } }],
      },
    });

    expect(() =>
      compileToScene(
        { type: 'scene', version: 1, children: [primitiveLegend] },
        createStandardBundle([LegendModule]).compile,
      ),
    ).not.toThrow();
    expect(() =>
      compileToScene(
        { type: 'scene', version: 1, children: [customLegend] },
        createStandardBundle([LegendModule]).compile,
      ),
    ).toThrow(/example\.badge|composite.*not registered/i);
  });

  it('keeps the Core warning when a capability is not selected', () => {
    const warningCodes: Array<string> = [];
    compileToScene(
      {
        type: 'scene',
        version: 1,
        children: [createGrid({ bounds: { min: [0, 0], max: [10, 10] }, spacing: 10 })],
      },
      {
        ...createStandardBundle([]).compile,
        onWarn: warning => warningCodes.push(warning.code),
      },
    );

    expect(warningCodes).toContain('COMPOSITE_NOT_REGISTERED');
  });
});
