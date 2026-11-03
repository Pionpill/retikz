import { compileToScene, createSharedCompileContext, resolveScopeStyle } from '@retikz/core';
import type { CompileWarning } from '@retikz/core';
import { describe, expect, it } from 'vitest';

import { lookupWeaveBinding, runWeaveCompilation } from '../../src/weave/compile';
import type { WeaveCompileRead, WeaveBinding } from '../../src/weave/compile';
import { compileWeaveNode, compileWeaveCoordinate } from '../../src/weave/element';
import { createWeaveNamespaceRegistry } from '../../src/weave/namespace';

describe('版本内名称与读取', () => {
  it('保留未命中 frame，pending 就绪后使用新结果，祖先引用不放宽', () => {
    const shared = createSharedCompileContext();
    const context = { shared, style: resolveScopeStyle({}, shared.registries.themeRegistry), irPath: [] };
    const outer = createWeaveNamespaceRegistry();
    const inner = createWeaveNamespaceRegistry(outer.namespace);
    const binding = {};
    const occurrence = { sourcePath: ['children', 0], expansionPath: [] };
    outer.register('a', { state: 'pending', binding }, ['children', 0, 'id'], occurrence);
    const input = {
      type: 'coordinate' as const,
      id: 'b',
      position: { direction: 'right' as const, of: 'a', distance: 10 },
    };
    const options = { ...context, namespace: inner.namespace };
    const pending = runWeaveCompilation(options, core => compileWeaveCoordinate(input, core));
    expect(pending.status).toBe('pending');
    expect(pending.reads.map(read => read.state)).toEqual(['missing', 'pending']);
    expect(pending.reads[0].namespace).toBe(inner.namespace);
    expect(pending.reads[1].binding).toBe(binding);
    expect(() =>
      runWeaveCompilation({ ...options, ancestorScopes: new Set([binding]) }, core =>
        compileWeaveCoordinate(input, core),
      ),
    ).toThrow('ancestor Scope');

    const node = runWeaveCompilation(context, runtime =>
      compileWeaveNode({ type: 'node', position: [30, 10] }, runtime),
    );
    if (node.status !== 'compiled') throw new Error('expected node');
    outer.replace(binding, { state: 'ready', binding, layout: node.compiled.layout });
    const ready = runWeaveCompilation(options, core => compileWeaveCoordinate(input, core));
    expect(ready.reads.map(read => read.state)).toEqual(['missing', 'ready']);
    if (ready.status !== 'compiled') throw new Error('expected coordinate');
    expect(ready.compiled.position).toEqual([40, 10]);

    const replacement = createWeaveNamespaceRegistry();
    replacement.register('a', { state: 'pending', binding: {} }, ['children', 0, 'id'], occurrence);
    const refreshed: Array<WeaveCompileRead> = [];
    lookupWeaveBinding(replacement.namespace, 'a', refreshed);
    expect(refreshed[0].namespace).toBe(replacement.namespace);
    expect(refreshed[0].binding).not.toBe(binding);
  });

  it('等待丢弃尝试内资源和诊断，重试只发布本次产物', () => {
    const shared = createSharedCompileContext();
    const bindings = new Map<string, WeaveBinding>([['a', { state: 'pending', binding: {} }]]);
    const options = {
      shared,
      style: resolveScopeStyle({}, shared.registries.themeRegistry),
      irPath: [],
      namespace: { bindings },
    };
    const pending = runWeaveCompilation(options, runtime => {
      compileWeaveNode(
        {
          type: 'node',
          position: [0, 0],
          style: {
            fill: {
              kind: 'linearGradient',
              angle: 0,
              stops: [
                { offset: 0, color: 'red' },
                { offset: 1, color: 'blue' },
              ],
            },
          },
        },
        runtime,
      );
      runtime.workspace.diagnosticCollector.collect({ code: 'discarded-warning', message: 'discarded', path: [] });
      return compileWeaveCoordinate(
        { type: 'coordinate', id: 'b', position: { direction: 'right', of: 'a' } },
        runtime,
      );
    });
    expect(pending).toMatchObject({ status: 'pending' });
    expect(pending).not.toHaveProperty('compiled');
    expect(pending).not.toHaveProperty('diagnostics');
    const ready = runWeaveCompilation(options, runtime =>
      compileWeaveNode({ type: 'node', position: [0, 0] }, runtime),
    );
    if (ready.status !== 'compiled') throw new Error('expected completed retry');
    expect(ready.compiled.output.resources).toEqual([]);
    expect(ready.diagnostics).toEqual([]);
  });

  it('同 frame 重名诊断与全量相同，旧 binding 替换不覆盖后来声明', () => {
    const warnings: Array<CompileWarning> = [];
    const registry = createWeaveNamespaceRegistry(undefined, warning => warnings.push(warning));
    const first = {};
    const second = {};
    for (const [index, binding] of [first, second].entries()) {
      registry.register('a', { state: 'pending', binding }, ['children', index, 'id'], {
        sourcePath: ['children', index],
        expansionPath: [],
      });
    }
    const expected: Array<CompileWarning> = [];
    compileToScene(
      {
        type: 'scene',
        version: 1,
        children: [
          { type: 'coordinate', id: 'a', position: [0, 0] },
          { type: 'coordinate', id: 'a', position: [10, 0] },
        ],
      },
      { onWarn: warning => expected.push(warning) },
    );
    expect(warnings).toEqual(expected);
    registry.replace(first, { state: 'pending', binding: first });
    expect(lookupWeaveBinding(registry.namespace, 'a')?.binding).toBe(second);
    const local = createWeaveNamespaceRegistry(registry.namespace, warning => warnings.push(warning));
    local.register('a', { state: 'pending', binding: first }, ['children', 2, 'id'], {
      sourcePath: ['children', 2],
      expansionPath: [],
    });
    expect(warnings).toHaveLength(1);
    expect(lookupWeaveBinding(local.namespace, 'a')?.binding).toBe(first);
    expect(lookupWeaveBinding(registry.namespace, 'a')?.binding).toBe(second);
  });
});
