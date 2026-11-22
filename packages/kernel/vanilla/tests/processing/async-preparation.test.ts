import { describe, expect, it } from 'vitest';

import type {
  InputEmbedAdapter,
  InputEmbedContribution,
  InputScene,
  InputSceneChildren,
  VanillaCompileResultExtensionSession,
} from '../../src';
import {
  embed,
  createProcessingControllerAsync,
  prepareStaticProcessingAsync,
  compileToScene,
  compileToSceneAsync,
  RetikzVanillaError,
} from '../../src';

const contribution = (id: string, x = 0): InputEmbedContribution => ({
  node: { type: 'node', id, position: [x, 0] },
  providerDependencies: { roots: [], providers: [] },
});

const source = (adapter: InputEmbedAdapter<{ x: number }>, x = 0): InputSceneChildren => ({
  type: 'scene',
  children: [embed({ adapter, props: { x } })],
});

describe('共享异步编写准备', () => {
  it('更新期间取消生命周期不会发布候选，退出编译后释放会话', async () => {
    const abort = new AbortController();
    let cancel = false;
    let commits = 0;
    const session: VanillaCompileResultExtensionSession = {
      resolve: () => {
        if (cancel) abort.abort();
        return [];
      },
      onCommit: () => {
        commits++;
      },
    };
    const controller = await createProcessingControllerAsync(
      { type: 'scene', children: [] },
      { signal: abort.signal, compileResultExtension: { create: () => session } },
    );
    const previous = controller.read();
    cancel = true;
    expect(await controller.update({ type: 'scene', children: [] })).toEqual({ kind: 'superseded' });
    expect(controller.read()).toBe(previous);
    expect(commits).toBe(1);
    expect(() => controller.subscribe(() => undefined)).toThrow(/disposed/i);
    controller.dispose();
  });

  it('当驱动程序创建回调取消请求时，不开始静态编译', async () => {
    const abort = new AbortController();
    let resolutions = 0;

    await expect(
      prepareStaticProcessingAsync(
        { type: 'scene', children: [] },
        {
          signal: abort.signal,
          compileResultExtension: {
            create: () => {
              abort.abort();
              return {
                resolve: () => {
                  resolutions++;
                  return [];
                },
              };
            },
          },
        },
      ),
    ).rejects.toThrow(/cancel|abort|invalid/);
    expect(resolutions).toBe(0);
  });

  it('在初始控制器提交之前拒绝取消同步编译回调', async () => {
    for (const phase of ['create', 'resolve'] as const) {
      const abort = new AbortController();
      let commits = 0;
      const extension = {
        create: () => {
          if (phase === 'create') abort.abort();
          return {
            resolve: () => {
              if (phase === 'resolve') abort.abort();
              return [];
            },
            onCommit: () => {
              commits++;
            },
          };
        },
      };

      await expect(
        createProcessingControllerAsync(
          { type: 'scene', children: [] },
          { compileResultExtension: extension, signal: abort.signal },
        ),
      ).rejects.toThrow(/cancel|abort|invalid|disposed/);
      expect(commits).toBe(0);
    }
  });

  it('取代同步编译回调中无效的更新，而不发布其修订版本', async () => {
    let invalidate: (() => void) | undefined;
    let commits = 0;
    const session: VanillaCompileResultExtensionSession = {
      resolve: () => {
        const callback = invalidate;
        invalidate = undefined;
        callback?.();

        return [];
      },
      onCommit: () => {
        commits++;
      },
    };
    const controller = await createProcessingControllerAsync(
      { type: 'scene', children: [] },
      { compileResultExtension: { create: () => session } },
    );
    const published: Array<number> = [];
    controller.subscribe(result => published.push(result.revision));
    let next: ReturnType<typeof controller.update> | undefined;
    invalidate = () => {
      next = controller.update({ type: 'scene', children: [{ type: 'node', position: [2, 0] }] });
    };
    const stale = await controller.update({ type: 'scene', children: [{ type: 'node', position: [1, 0] }] });

    expect(stale).toEqual({ kind: 'superseded' });
    expect(await next).toMatchObject({ kind: 'committed', result: { revision: 1 } });
    expect(published).toEqual([1]);
    expect(commits).toBe(2);
    expect(controller.diagnostics()).toEqual([]);

    controller.dispose();
  });

  it('为多个嵌套槽提供具有同步身份等价性的不同编写位置', async () => {
    const inner = {
      kind: 'async-node',
      lower: (props: { x: number }, context: { id: string }) => contribution(context.id, props.x),
      prepare: (props: { x: number }, context: { id: string }) => ({
        execute: () => contribution(context.id, props.x),
      }),
    };
    const outer: InputEmbedAdapter<unknown> & Required<Pick<InputEmbedAdapter<unknown>, 'prepare'>> = {
      kind: 'slots',
      lower: (_props, context) => {
        const left = context.normalizeChildren?.(source(inner, 1).children);
        const right = context.normalizeChildren?.(source(inner, 2).children);
        if (left === undefined || right === undefined) throw new Error('missing children');

        return {
          node: { type: 'scope', id: context.id, children: [...left.children, ...right.children] },
          providerDependencies: { roots: [], providers: [] },
        };
      },
      prepare: async (_props, context) => {
        const left = await context.prepareChildren(source(inner, 1).children);
        const right = await context.prepareChildren(source(inner, 2).children);

        return {
          execute: async () => ({
            node: {
              type: 'scope',
              id: context.id,
              children: [...(await left.execute()).children, ...(await right.execute()).children],
            },
            providerDependencies: { roots: [], providers: [] },
          }),
        };
      },
    };
    const input: InputSceneChildren = { type: 'scene', children: [embed({ adapter: outer, props: {} })] };
    const synchronous = compileToScene(input);
    const asynchronous = await compileToSceneAsync(input);

    expect(asynchronous.compileResult.scene).toEqual(synchronous.compileResult.scene);

    const group = asynchronous.compileResult.scene.primitives[0];
    if (group.type !== 'group') throw new Error('Expected the authored Scope group');

    expect(group.children).toHaveLength(2);
    expect(new Set(group.children.map(child => child.id)).size).toBe(2);
  });

  it('拒绝准备期间的嵌套执行、缺少 prepare 的适配器而不进行计算', async () => {
    let executed = 0;
    const inner = {
      kind: 'async-node',
      prepare: (_props: unknown, context: { id: string }) => ({
        execute: () => {
          executed++;
          return contribution(context.id);
        },
      }),
    };
    const outer = {
      kind: 'container',
      prepare: async (_props: unknown, context: Parameters<NonNullable<InputEmbedAdapter<unknown>['prepare']>>[1]) => {
        const children = await context.prepareChildren(source(inner).children);
        await children.execute();
        return { execute: () => contribution(context.id) };
      },
    };

    await expect(
      compileToSceneAsync({ type: 'scene', children: [embed({ adapter: outer, props: {} })] }),
    ).rejects.toThrow(/during preparation/);
    expect(executed).toBe(0);
    await expect(compileToSceneAsync(source({ kind: 'sync', lower: () => contribution('sync') }))).rejects.toThrow(
      /no prepare adapter/,
    );
  });

  it('在准备和下沉过程中保持图层、Scope 上下文相同', async () => {
    const syncContexts: Array<{ id: string; identityPath: Array<string> }> = [];
    const asyncContexts: typeof syncContexts = [];
    const adapter = {
      kind: 'probe',
      lower: (_props: unknown, context: Parameters<NonNullable<InputEmbedAdapter<unknown>['lower']>>[1]) => {
        syncContexts.push({ id: context.id, identityPath: context.identityPath });
        return contribution(context.id);
      },
      prepare: (_props: unknown, context: Parameters<NonNullable<InputEmbedAdapter<unknown>['prepare']>>[1]) => {
        asyncContexts.push({ id: context.id, identityPath: context.identityPath });
        return { execute: () => contribution(context.id) };
      },
    };
    const input: InputScene = {
      type: 'scene',
      layers: [
        {
          type: 'layer',
          name: 'front',
          zIndex: 2,
          children: [
            {
              type: 'scope',
              id: 'container',
              theme: { mode: 'dark' },
              children: [embed({ adapter, props: {} })],
            },
          ],
        },
        {
          type: 'layer',
          name: 'back',
          zIndex: 1,
          children: [embed({ adapter, props: {} }), embed({ adapter, props: {} })],
        },
      ],
    };
    const sync = compileToScene(input);
    const asynchronous = await compileToSceneAsync(input);

    expect(asyncContexts).toEqual(syncContexts);
    expect(asynchronous.map(layer => layer.result.compileResult.scene)).toEqual(
      sync.map(layer => layer.result.compileResult.scene),
    );
  });

  it('处理生命周期取消并防止发布后期忽略信号结果', async () => {
    let complete: ((value: InputEmbedContribution) => void) | undefined;
    const abort = new AbortController();
    const adapter = {
      kind: 'async-node',
      prepare: (props: { x: number }, context: { id: string }) => ({
        execute: () =>
          props.x === 0
            ? contribution(context.id)
            : new Promise<InputEmbedContribution>(resolve => {
                complete = resolve;
              }),
      }),
    };
    const controller = await createProcessingControllerAsync(source(adapter), { signal: abort.signal });
    let publications = 0;
    controller.subscribe(() => {
      publications++;
    });
    const pending = controller.update(source(adapter, 1));
    await new Promise(resolve => setTimeout(resolve, 0));
    abort.abort();
    complete?.(contribution('__retikz-embed:default:children[0]:async-node', 1));

    expect(await pending).toEqual({ kind: 'superseded' });
    expect(publications).toBe(0);
    await expect(controller.update(source(adapter))).rejects.toBeInstanceOf(RetikzVanillaError);
    expect(() => controller.subscribe(() => undefined)).toThrow(/disposed/);
  });

  it('同 kind 的不同实现按位置产生贡献', async () => {
    const executed: Array<number> = [];
    const bound = (x: number) =>
      embed({
        adapter: {
          kind: 'shared',
          lower: (_props, context) => contribution(context.id, x),
          prepare: (_props, context) => ({
            execute: () => {
              executed.push(x);
              return contribution(context.id, x);
            },
          }),
        },
        props: {},
      });
    const input: InputSceneChildren = { type: 'scene', children: [bound(1), bound(2)] };
    const sync = compileToScene(input);
    const asyncResult = await compileToSceneAsync(input);
    expect(asyncResult.compileResult.scene).toEqual(sync.compileResult.scene);
    expect(executed).toEqual([1, 2]);
  });

  it('在执行任何贡献之前准备整个编写树', async () => {
    const calls: Array<string> = [];
    const adapter = {
      kind: 'async-node',
      prepare: (props: { x: number }, context: { id: string }) => {
        calls.push(`prepare:${props.x}`);
        if (props.x === 2) throw new Error('unsupported');

        return {
          execute: () => {
            calls.push(`execute:${props.x}`);
            return contribution(context.id, props.x);
          },
        };
      },
    };

    await expect(
      compileToSceneAsync({
        type: 'scene',
        children: [...source(adapter, 1).children, ...source(adapter, 2).children],
      }),
    ).rejects.toThrow(/unsupported/);
    expect(calls).toEqual(['prepare:1', 'prepare:2']);
  });

  it('在同步和异步路径中使用相同的匿名身份、主题和嵌套编写贡献', async () => {
    const inner = {
      kind: 'async-node',
      lower: (props: { x: number }, context: { id: string }) => contribution(context.id, props.x),
      prepare: (props: { x: number }, context: { id: string }) => ({
        execute: () => contribution(context.id, props.x),
      }),
    };
    const outer: InputEmbedAdapter<{ children: InputScene['children'] }> &
      Required<Pick<InputEmbedAdapter<{ children: InputScene['children'] }>, 'prepare'>> = {
      kind: 'container',
      lower: (props, context) => {
        const children = context.normalizeChildren?.(props.children ?? []);
        if (children === undefined) throw new Error('missing children context');

        return {
          node: { type: 'scope', id: context.id, children: [...children.children] },
          providerDependencies: children.providerDependencies,
          authoringSites: children.authoringSites,
        };
      },
      prepare: async (props, context) => {
        const children = await context.prepareChildren(props.children ?? []);
        return {
          execute: async () => {
            const normalized = await children.execute();
            return {
              node: { type: 'scope', id: context.id, children: [...normalized.children] },
              providerDependencies: normalized.providerDependencies,
              authoringSites: normalized.authoringSites,
            };
          },
        };
      },
    };
    const input: InputScene = {
      type: 'scene',
      theme: { mode: 'dark' },
      children: [embed({ adapter: outer, props: { children: source(inner, 4).children } })],
    };
    const sync = compileToScene(input);
    const asyncResult = await compileToSceneAsync(input);

    expect(asyncResult.compileResult.scene).toEqual(sync.compileResult.scene);
  });

  it('使丢弃和提交互斥的终止状态', async () => {
    const adapter = {
      kind: 'async-node',
      prepare: (props: { x: number }, context: { id: string }) => ({
        execute: () => contribution(context.id, props.x),
      }),
    };
    const discarded = await prepareStaticProcessingAsync(source(adapter), {}, 3);
    discarded.discard();
    discarded.discard();

    expect(() => discarded.commit()).toThrow(/discard|terminal/);

    const committed = await prepareStaticProcessingAsync(source(adapter), {}, 4);
    committed.commit();
    committed.commit();

    expect(() => committed.discard()).toThrow(/commit|terminal/);

    const abort = new AbortController();
    const cancelled = await prepareStaticProcessingAsync(source(adapter), { signal: abort.signal }, 5);
    abort.abort();

    expect(() => cancelled.commit()).toThrow(/cancel|abort|invalid/);

    cancelled.discard();
  });

  it('在可重入驱动程序回调之前消费候选提交', async () => {
    let commits = 0;
    let discardCause: unknown;
    const candidate: Awaited<ReturnType<typeof prepareStaticProcessingAsync>> = await prepareStaticProcessingAsync(
      { type: 'scene', children: [] },
      {
        compileResultExtension: {
          create: () => ({
            resolve: () => [],
            onCommit: () => {
              commits++;
              candidate.commit();

              try {
                candidate.discard();
              } catch (cause) {
                discardCause = cause;
              }
            },
          }),
        },
      },
    );
    candidate.commit();
    candidate.commit();

    expect(commits).toBe(1);
    expect(discardCause).toBeInstanceOf(RetikzVanillaError);
  });

  it('仅发布当前完整更新并在失败时保留已提交的修订', async () => {
    const completions = new Map<
      number,
      { resolve: (value: InputEmbedContribution) => void; reject: (cause: unknown) => void }
    >();
    const adapter = {
      kind: 'async-node',
      prepare: (props: { x: number }, context: { id: string }) => ({
        execute: () =>
          props.x === 0
            ? contribution(context.id)
            : new Promise<InputEmbedContribution>((resolve, reject) => completions.set(props.x, { resolve, reject })),
      }),
    };
    const controller = await createProcessingControllerAsync(source(adapter));
    const published: Array<number> = [];
    controller.subscribe(result => published.push(result.revision));
    const old = controller.update(source(adapter, 1));
    await new Promise(resolve => setTimeout(resolve, 0));
    const next = controller.update(source(adapter, 2));
    await new Promise(resolve => setTimeout(resolve, 0));
    completions.get(2)?.resolve(contribution('__retikz-embed:default:children[0]:async-node', 2));

    expect((await next).kind).toBe('committed');

    completions.get(1)?.reject(new Error('late error'));

    expect(await old).toEqual({ kind: 'superseded' });
    expect(controller.diagnostics()).toEqual([]);

    const failed = controller.update(source(adapter, 3));
    await new Promise(resolve => setTimeout(resolve, 0));
    completions.get(3)?.reject(new Error('current error'));

    await expect(failed).rejects.toThrow(/current error/);
    expect(controller.read().revision).toBe(1);
    expect(published).toEqual([1]);
    expect(controller.diagnostics()).toHaveLength(1);

    controller.dispose();
  });
});
