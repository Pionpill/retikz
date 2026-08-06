import { describe, expect, expectTypeOf, it } from 'vitest';

import type {
  CompiledSceneFragment,
  CompileFragmentDiagnostic,
  CompileObservation,
  CompileObservationContext,
  CompileObserverDefinition,
  CompileOwnerOutputDefinition,
  CompileResult,
  IRScene,
  ObservedCompileResult,
} from '../../../src';

import * as core from '../../../src';

const emptyScene: IRScene = { version: 1, type: 'scene', children: [] };

describe('Core observation public contract', () => {
  it('exports only the domain-neutral observation entry points', () => {
    expect(Reflect.get(core, 'observeCompileToScene')).toBeTypeOf('function');
    expect('InspectorDefinition' in core).toBe(false);
    expect('InspectionPlane' in core).toBe(false);

    const result = core.compileToScene(emptyScene);
    expect('inspection' in result).toBe(false);
  });

  it('keeps the public observation contracts JSON-safe and fragment-oriented', () => {
    expectTypeOf<CompileOwnerOutputDefinition<{ value: string }>>().toMatchTypeOf<{ schema: object }>();
    expectTypeOf<CompileObserverDefinition<{ count: number }>>().toMatchTypeOf<{ key: string }>();
    expectTypeOf<CompileObservation>().toHaveProperty('owner');
    expectTypeOf<CompileObservationContext['compileFragment']>().toBeFunction();
    expectTypeOf<Extract<CompiledSceneFragment['artifacts'][number], { kind: 'composite' }>>().toHaveProperty(
      'namespace',
    );
    expectTypeOf<Extract<CompiledSceneFragment['artifacts'][number], { kind: 'composite' }>>().toHaveProperty('type');
    expectTypeOf<CompileFragmentDiagnostic>().toHaveProperty('origin');
    expectTypeOf<CompileResult>().not.toHaveProperty('inspection');
    expectTypeOf<ObservedCompileResult>().toHaveProperty('observerOutputs');
  });
});

void emptyScene;
