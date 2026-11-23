import type { CompileWarning, IRScene } from '@retikz/core';
import { RetikzError } from '@retikz/foundation';
import { describe, expect, it, vi } from 'vitest';

import { compileToScene, SceneRuntime } from '../../src';
import type { VanillaCompileResultExtension } from '../../src';
import { defaultVanillaCompileResultExtension, RetikzVanillaError, RetikzVanillaErrorCode } from '../../src';
import type { VanillaReconcilerOutput } from '../../src/runtime/compile/result-extension';
import { ResultExtensionHost } from '../../src/runtime/compile/result-extension';
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
  it('单图一次性编译将同一结果通知扩展一次', () => {
    const notify = vi.fn();
    const result = compileToScene(
      { type: 'scene', children: [] },
      { compileResultExtension: { create: () => ({ resolve: () => undefined, onCommit: notify }) } },
    );
    expect(notify.mock.calls[0]?.[0]).toBe(result);
    expect(notify).toHaveBeenCalledOnce();
  });
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

  it('默认扩展不改变原始编译结果', () => {
    const result = compileToScene(source, { compileResultExtension: defaultVanillaCompileResultExtension });
    expect(result).toEqual(compileTestResult(source, {}));
  });

  it('同一个扩展会话只解析同一编译快照一次', () => {
    const coreOutput: VanillaReconcilerOutput = Object.freeze({
      result: compileTestResult(source, {}),
      diagnostics: Object.freeze([]),
    });
    const resolve = vi.fn();
    const sharedSession = { resolve };
    const extension: VanillaCompileResultExtension = { create: () => sharedSession };
    const input = Object.freeze({ instance: {}, source, authoringSites: Object.freeze([]), coreOptions: {} });
    const session = ResultExtensionHost.open(extension, input);

    session.prepare(coreOutput);
    ResultExtensionHost.open(extension, input).prepare(coreOutput);
    expect(resolve).toHaveBeenCalledOnce();
    expect(resolve).toHaveBeenCalledWith(coreOutput);
  });

  it('持续会话通过 diagnostics 交付并清空 warning 回调异常', () => {
    const cause = new Error('warning callback failed');
    const runtime = SceneRuntime.fromIR(
      { type: 'scene', version: 1, children: [{ namespace: 'missing', type: 'composite' }] },
      {
        compile: {
          onWarn: () => {
            throw cause;
          },
        },
      },
    );
    try {
      expect(runtime.read().compilation.result.scene.primitives).toEqual([]);
      expect(runtime.diagnostics()).toContain(cause);
      expect(runtime.diagnostics()).toEqual([]);
    } finally {
      runtime.dispose();
    }
  });

  it('static extension 收到同次编译诊断并保留一次 onWarn 通知', () => {
    const onWarn = vi.fn();
    let diagnostics: ReadonlyArray<CompileWarning> | undefined;
    compileToScene(
      { type: 'scene', version: 1, children: [{ namespace: 'missing', type: 'composite' }] },
      {
        compile: { onWarn },
        compileResultExtension: {
          create: () => ({
            resolve: snapshot => {
              diagnostics = snapshot.diagnostics;
            },
          }),
        },
      },
    );
    expect(onWarn).toHaveBeenCalledOnce();
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics?.[0]).toBe(onWarn.mock.calls[0][0]);
  });
});
