import type { AnyCompositeDefinition, CompileObserverDefinition, CoreProgramOutput, IRScene } from '@retikz/core';
import type { RenderReadonlyLayer } from '@retikz/render/runtime';

import { compileToScene } from '@retikz/core';
import { describe, expect, it, vi } from 'vitest';

import type { VanillaCompileDriver, VanillaCompileOutput } from '../../src';

import {
  compileVanillaWithDriver,
  createVanillaCompileDriverSession,
  defaultVanillaCompileDriver,
  resolveVanillaCompileOutput,
  VanillaCompileDriverError,
} from '../../src';

const source: IRScene = {
  version: 1,
  type: 'scene',
  children: [
    {
      type: 'path',
      children: [
        { type: 'step', kind: 'move', to: [0, 0] },
        { type: 'step', kind: 'line', to: [20, 0] },
      ],
    },
  ],
};

const observer: CompileObserverDefinition<string> = Object.freeze({
  key: 'fixture/vanilla-driver',
  createSession: () =>
    Object.freeze({
      select: () => false,
      observe: () => undefined,
      complete: () => 'same-revision',
    }),
});

describe('Vanilla compile driver', () => {
  it('非法 session 统一抛出结构化驱动错误', () => {
    const input = Object.freeze({ instance: {}, source, authoringSites: Object.freeze([]), coreOptions: {} });
    const driver = { create: () => null } as unknown as VanillaCompileDriver;

    expect(() => createVanillaCompileDriverSession(driver, input)).toThrow(VanillaCompileDriverError);
  });

  it('默认 driver 使用普通 Core compile、空 observers、空 diagnostics 与冻结空 readonly layers', () => {
    const input = Object.freeze({
      instance: {},
      source,
      authoringSites: Object.freeze([]),
      coreOptions: Object.freeze({}),
    });
    const session = createVanillaCompileDriverSession(defaultVanillaCompileDriver, input);
    const output = compileVanillaWithDriver(input, session);

    expect(session.observers).toEqual([]);
    expect(output.primary).toEqual(compileToScene(source, {}));
    expect(output.observerOutputs).toEqual([]);
    expect(output.layers).toEqual([]);
    expect(output.diagnostics).toEqual([]);
    expect(Object.isFrozen(output.layers)).toBe(true);
  });

  it('同 revision output 保留 Core primary/observerOutputs 并校验 readonly layers', () => {
    const coreOutput: CoreProgramOutput<ReadonlyArray<AnyCompositeDefinition>> = Object.freeze({
      result: compileToScene(source, {}),
      diagnostics: Object.freeze([]),
      observerOutputs: Object.freeze([{ key: observer.key, value: 'same-revision' }]),
    });
    const layer: RenderReadonlyLayer = Object.freeze({
      key: 'fixture-layer',
      scene: coreOutput.result.scene,
      transform: [1, 0, 0, 1, 0, 4] as const,
    });
    const driver: VanillaCompileDriver = Object.freeze({
      create: () => ({
        observers: [observer],
        resolve: output =>
          Object.freeze({
            primary: output.result,
            observerOutputs: output.observerOutputs,
            layers: Object.freeze([layer]),
            diagnostics: Object.freeze(['same-revision']),
          }),
      }),
    });
    const input = Object.freeze({ instance: {}, source, authoringSites: Object.freeze([]), coreOptions: {} });
    const session = createVanillaCompileDriverSession(driver, input);

    expect(resolveVanillaCompileOutput(session, coreOutput)).toEqual({
      primary: coreOutput.result,
      observerOutputs: coreOutput.observerOutputs,
      layers: [layer],
      diagnostics: ['same-revision'],
    } satisfies VanillaCompileOutput);
  });

  it('static observed driver 保留 Core onWarn 通知', () => {
    const onWarn = vi.fn();
    const input = Object.freeze({
      instance: {},
      source: {
        version: 1 as const,
        type: 'scene' as const,
        children: [{ namespace: 'missing', type: 'composite' }],
      },
      authoringSites: Object.freeze([]),
      coreOptions: { onWarn },
    });
    const session = createVanillaCompileDriverSession(
      Object.freeze({
        create: () => ({ observers: [observer], resolve: defaultVanillaCompileDriver.create(input).resolve }),
      }),
      input,
    );

    compileVanillaWithDriver(input, session);

    expect(onWarn).toHaveBeenCalledTimes(1);
  });

  it('非法 resolver output 统一抛出可由 retained host 回滚的结构化错误', () => {
    const coreOutput: CoreProgramOutput<ReadonlyArray<AnyCompositeDefinition>> = Object.freeze({
      result: compileToScene(source, {}),
      diagnostics: Object.freeze([]),
      observerOutputs: Object.freeze([]),
    });
    const session = Object.freeze({
      observers: Object.freeze([]),
      resolve: () =>
        Object.freeze({
          primary: compileToScene(source, {}),
          observerOutputs: coreOutput.observerOutputs,
          layers: Object.freeze([]),
          diagnostics: Object.freeze([]),
        }),
    });

    expect(() => resolveVanillaCompileOutput(session, coreOutput)).toThrow(VanillaCompileDriverError);
  });
});
