import type { CompileWarning, IRScene } from '@retikz/core';
import { RetikzError } from '@retikz/foundation';
import { describe, expect, it, vi } from 'vitest';

import type { VanillaCompileResultExtension, VanillaCompileOutput } from '../../src';
import { defaultVanillaCompileResultExtension, RetikzVanillaError, RetikzVanillaErrorCode } from '../../src';
import type { VanillaReconcilerOutput } from '../../src/runtime/compile/result-extension';
import { ResultExtensionHost } from '../../src/runtime/compile/result-extension';
import { compileVanillaWithResultExtension } from '../../src/runtime/compile/static';
import { compileTestResult } from '../helpers/compilation';

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

describe('Vanilla 编译结果扩展程序', () => {
  it('使用共享的 Retikz 错误契约', () => {
    const cause = new Error('extension cause');
    const error = new RetikzVanillaError({
      code: RetikzVanillaErrorCode.CompileResultExtensionFailed,
      message: 'extension failed',
      details: Object.freeze({}),
      cause,
    });

    expect(error).toBeInstanceOf(RetikzError);
    expect(error).toMatchObject({
      name: 'RetikzVanillaError',
      code: RetikzVanillaErrorCode.CompileResultExtensionFailed,
      message: 'extension failed',
      cause,
      details: {},
    });
  });

  it('扩展创建失败时保留回调异常', () => {
    const input = Object.freeze({ instance: {}, source, authoringSites: Object.freeze([]), coreOptions: {} });
    const cause = new Error('extension creation failed');
    const extension: VanillaCompileResultExtension = {
      create: () => {
        throw cause;
      },
    };

    expect(() => ResultExtensionHost.open(extension, input)).toThrowError(
      expect.objectContaining({
        name: 'RetikzVanillaError',
        cause,
        code: RetikzVanillaErrorCode.CompileResultExtensionFailed,
      }),
    );
  });

  it('默认 extension 使用普通 Core compile、空 diagnostics', () => {
    const input = Object.freeze({
      instance: {},
      source,
      authoringSites: Object.freeze([]),
      coreOptions: Object.freeze({}),
    });
    const session = ResultExtensionHost.open(defaultVanillaCompileResultExtension, input);
    const output = compileVanillaWithResultExtension(input, session);
    expect(output.primary).toEqual(compileTestResult(source, {}));
    expect(output.processingDiagnostics).toEqual([]);
  });

  it('同 revision output 保留 Core primary 与扩展诊断', () => {
    const coreOutput: VanillaReconcilerOutput = Object.freeze({
      result: compileTestResult(source, {}),
      diagnostics: Object.freeze([]),
    });
    const resolve = vi.fn(() => ['same-revision']);
    const sharedSession = { resolve };
    const extension: VanillaCompileResultExtension = { create: () => sharedSession };
    const input = Object.freeze({ instance: {}, source, authoringSites: Object.freeze([]), coreOptions: {} });
    const session = ResultExtensionHost.open(extension, input);

    const resolved = session.prepare(coreOutput);
    expect(ResultExtensionHost.open(extension, input).prepare(coreOutput)).toBe(resolved);
    expect(resolve).toHaveBeenCalledTimes(1);
    expect(resolved.primary).toBe(coreOutput.result);
    expect(resolved).toEqual({
      primary: coreOutput.result,

      processingDiagnostics: ['same-revision'],
    } satisfies VanillaCompileOutput);
  });

  it('static extension 收到同次编译诊断并保留一次 onWarn 通知', () => {
    const onWarn = vi.fn();
    let diagnostics: ReadonlyArray<CompileWarning> | undefined;
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
    const session = ResultExtensionHost.open(
      Object.freeze({
        create: () => ({
          resolve: output => {
            diagnostics = output.diagnostics;
            return defaultVanillaCompileResultExtension.create(input).resolve(output);
          },
        }),
      }),
      input,
    );

    compileVanillaWithResultExtension(input, session);

    expect(onWarn).toHaveBeenCalledTimes(1);
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics?.[0]).toBe(onWarn.mock.calls[0][0]);
  });

  it('一次性编译保留 warning 回调失败的非致命诊断', () => {
    const cause = new Error('warning callback failed');
    const input = Object.freeze({
      instance: {},
      source: {
        version: 1 as const,
        type: 'scene' as const,
        children: [{ namespace: 'missing', type: 'composite' }],
      },
      authoringSites: Object.freeze([]),
      coreOptions: {
        onWarn: () => {
          throw cause;
        },
      },
    });
    const session = ResultExtensionHost.open(defaultVanillaCompileResultExtension, input);
    const output = compileVanillaWithResultExtension(input, session);

    expect(output.primary.scene.primitives).toEqual([]);
    expect(output.processingDiagnostics).toContain(cause);
  });
});
