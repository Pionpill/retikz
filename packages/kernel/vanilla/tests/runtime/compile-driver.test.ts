import type { AnyCompositeDefinition, IRScene } from '@retikz/core';
import { compileToScene } from '@retikz/core';
import { RetikzError } from '@retikz/foundation';
import type { ReconcilerOutput } from '@retikz/reconciler';
import type { RenderReadonlyLayer } from '@retikz/render/runtime';
import { describe, expect, it, vi } from 'vitest';

import type { VanillaCompileDriver, VanillaCompileOutput } from '../../src';
import {
  compileVanillaWithDriver,
  createVanillaCompileDriverSession,
  defaultVanillaCompileDriver,
  resolveVanillaCompileOutput,
  RetikzVanillaError,
  RetikzVanillaErrorCode,
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

describe('Vanilla 编译驱动程序', () => {
  it('使用共享的 Retikz 错误契约', () => {
    const cause = new Error('driver cause');
    const error = new RetikzVanillaError({
      code: RetikzVanillaErrorCode.CompileDriverFailed,
      message: 'driver failed',
      details: Object.freeze({}),
      cause,
    });

    expect(error).toBeInstanceOf(RetikzError);
    expect(error).toMatchObject({
      name: 'RetikzVanillaError',
      code: RetikzVanillaErrorCode.CompileDriverFailed,
      message: 'driver failed',
      cause,
      details: {},
    });
  });

  it('非法 session 统一抛出结构化驱动错误', () => {
    const input = Object.freeze({ instance: {}, source, authoringSites: Object.freeze([]), coreOptions: {} });
    const driver = { create: () => null } as unknown as VanillaCompileDriver;

    expect(() => createVanillaCompileDriverSession(driver, input)).toThrowError(
      expect.objectContaining({
        name: 'RetikzVanillaError',
        code: RetikzVanillaErrorCode.CompileDriverFailed,
      }),
    );
  });

  it('默认 driver 使用普通 Core compile、空 diagnostics 与冻结空 readonly layers', () => {
    const input = Object.freeze({
      instance: {},
      source,
      authoringSites: Object.freeze([]),
      coreOptions: Object.freeze({}),
    });
    const session = createVanillaCompileDriverSession(defaultVanillaCompileDriver, input);
    const output = compileVanillaWithDriver(input, session);
    expect(output.primary).toEqual(compileToScene(source, {}));
    expect(output.layers).toEqual([]);
    expect(output.diagnostics).toEqual([]);
    expect(Object.isFrozen(output.layers)).toBe(true);
  });

  it('同 revision output 保留 Core primary 并校验 readonly layers', () => {
    const coreOutput: ReconcilerOutput<ReadonlyArray<AnyCompositeDefinition>> = Object.freeze({
      result: compileToScene(source, {}),
      diagnostics: Object.freeze([]),
    });
    const layer: RenderReadonlyLayer = Object.freeze({
      key: 'fixture-layer',
      scene: coreOutput.result.scene,
      transform: [1, 0, 0, 1, 0, 4] as const,
    });
    const driver: VanillaCompileDriver = Object.freeze({
      create: () => ({
        resolve: output =>
          Object.freeze({
            primary: output.result,
            layers: Object.freeze([layer]),
            diagnostics: Object.freeze(['same-revision']),
          }),
      }),
    });
    const input = Object.freeze({ instance: {}, source, authoringSites: Object.freeze([]), coreOptions: {} });
    const session = createVanillaCompileDriverSession(driver, input);

    expect(resolveVanillaCompileOutput(session, coreOutput)).toEqual({
      primary: coreOutput.result,
      layers: [layer],
      diagnostics: ['same-revision'],
    } satisfies VanillaCompileOutput);
  });

  it('static driver 保留 Core onWarn 通知', () => {
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
        create: () => ({ resolve: defaultVanillaCompileDriver.create(input).resolve }),
      }),
      input,
    );

    compileVanillaWithDriver(input, session);

    expect(onWarn).toHaveBeenCalledTimes(1);
  });

  it('非法 resolver output 统一抛出可由 retained host 回滚的结构化错误', () => {
    const coreOutput: ReconcilerOutput<ReadonlyArray<AnyCompositeDefinition>> = Object.freeze({
      result: compileToScene(source, {}),
      diagnostics: Object.freeze([]),
    });
    const session = Object.freeze({
      resolve: () =>
        Object.freeze({
          primary: compileToScene(source, {}),
          layers: Object.freeze([]),
          diagnostics: Object.freeze([]),
        }),
    });

    expect(() => resolveVanillaCompileOutput(session, coreOutput)).toThrowError(
      expect.objectContaining({
        name: 'RetikzVanillaError',
        code: RetikzVanillaErrorCode.CompileDriverFailed,
      }),
    );
  });
});
