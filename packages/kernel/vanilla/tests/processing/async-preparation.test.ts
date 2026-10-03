import { describe, expect, it } from 'vitest';

import type {
  InputEmbedAdapter,
  InputEmbedContribution,
  InputScene,
  InputSceneChildren,
  VanillaCompileDriverSession,
} from '../../src';
import {
  createProcessingControllerAsync,
  prepareStaticProcessingAsync,
  processToStaticInputResult,
  processToStaticInputResultAsync,
  RetikzVanillaError,
} from '../../src';

const contribution = (id: string, x = 0): InputEmbedContribution => ({
  node: { type: 'node', id, position: [x, 0] },
  providerDependencies: { roots: [], providers: [] },
});
const source = (x = 0): InputSceneChildren => ({ children: [{ type: 'embed', kind: 'async-node', props: { x } }] });

describe('shared async authoring preparation', () => {
  it('does not begin static compilation when the driver creation callback cancels the request', async () => {
    const abort = new AbortController();
    let resolutions = 0;
    await expect(
      prepareStaticProcessingAsync(
        { children: [] },
        {
          signal: abort.signal,
          compileDriver: {
            create: () => {
              abort.abort();
              return {
                observers: [],
                resolve: output => {
                  resolutions++;
                  return {
                    primary: output.result,
                    observerOutputs: output.observerOutputs,
                    layers: [],
                    diagnostics: [],
                  };
                },
              };
            },
          },
        },
      ),
    ).rejects.toThrow(/cancel|abort|invalid/);
    expect(resolutions).toBe(0);
  });
  it('rejects cancellation from synchronous compile callbacks before an initial controller commits', async () => {
    for (const phase of ['create', 'resolve'] as const) {
      const abort = new AbortController();
      let commits = 0;
      const driver = {
        create: () => {
          if (phase === 'create') abort.abort();
          return {
            observers: [],
            resolve: (output: Parameters<VanillaCompileDriverSession['resolve']>[0]) => {
              if (phase === 'resolve') abort.abort();
              return { primary: output.result, observerOutputs: output.observerOutputs, layers: [], diagnostics: [] };
            },
            commit: () => {
              commits++;
            },
          };
        },
      };
      await expect(
        createProcessingControllerAsync({ children: [] }, { compileDriver: driver, signal: abort.signal }),
      ).rejects.toThrow(/cancel|abort|invalid|disposed/);
      expect(commits).toBe(0);
    }
  });

  it('supersedes an update invalidated from a synchronous compile callback without publishing its revision', async () => {
    let invalidate: (() => void) | undefined;
    let commits = 0;
    const session: VanillaCompileDriverSession = {
      observers: [],
      resolve: output => {
        const callback = invalidate;
        invalidate = undefined;
        callback?.();
        return { primary: output.result, observerOutputs: output.observerOutputs, layers: [], diagnostics: [] };
      },
      commit: () => {
        commits++;
      },
    };
    const controller = await createProcessingControllerAsync(
      { children: [] },
      { compileDriver: { create: () => session } },
    );
    const published: Array<number> = [];
    controller.subscribe(result => published.push(result.revision));
    let next: ReturnType<typeof controller.update> | undefined;
    invalidate = () => {
      next = controller.update({ children: [{ type: 'node', position: [2, 0] }] });
    };
    const stale = await controller.update({ children: [{ type: 'node', position: [1, 0] }] });
    expect(stale).toEqual({ kind: 'superseded' });
    expect(await next).toMatchObject({ kind: 'committed', result: { revision: 1 } });
    expect(published).toEqual([1]);
    expect(commits).toBe(2);
    expect(controller.diagnostics()).toEqual([]);
    controller.dispose();
  });

  it('gives multiple nested slots distinct authored positions with synchronous identity parity', async () => {
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
        const left = context.normalizeChildren?.(source(1).children);
        const right = context.normalizeChildren?.(source(2).children);
        if (left === undefined || right === undefined) throw new Error('missing children');
        return {
          node: { type: 'scope', id: context.id, children: [...left.children, ...right.children] },
          providerDependencies: { roots: [], providers: [] },
        };
      },
      prepare: async (_props, context) => {
        const left = await context.prepareChildren(source(1).children);
        const right = await context.prepareChildren(source(2).children);
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
    const input: InputSceneChildren = { children: [{ type: 'embed', kind: 'slots', props: {} }] };
    const synchronous = processToStaticInputResult(input, { adapters: [outer, inner] });
    const asynchronous = await processToStaticInputResultAsync(input, { adapters: [outer, inner] });
    expect(asynchronous.scene).toEqual(synchronous.scene);
    expect([...asynchronous.runtimeMeta.identityIndex]).toEqual([...synchronous.runtimeMeta.identityIndex]);
    const nestedIds = [...asynchronous.runtimeMeta.identityIndex.keys()].filter(id => id.endsWith(':async-node'));
    expect(nestedIds).toHaveLength(2);
    const group = asynchronous.scene.primitives[0];
    if (group.type !== 'group') throw new Error('Expected the authored Scope group');
    expect(group.children).toHaveLength(2);
  });
  it('rejects nested execution during prepare, unknown adapters and duplicate kinds without computing', async () => {
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
        const children = await context.prepareChildren(source().children);
        await children.execute();
        return { execute: () => contribution(context.id) };
      },
    };
    await expect(
      processToStaticInputResultAsync(
        { children: [{ type: 'embed', kind: 'container', props: {} }] },
        { adapters: [outer, inner] },
      ),
    ).rejects.toThrow(/during preparation/);
    expect(executed).toBe(0);
    await expect(processToStaticInputResultAsync(source(), { adapters: [inner, inner] })).rejects.toThrow(/Duplicate/);
    await expect(processToStaticInputResultAsync(source())).rejects.toThrow(/no prepare adapter/);
  });

  it('keeps layer, Scope and Theme contexts identical across preparation and lowering', async () => {
    const syncContexts: Array<{ id: string; identityPath: Array<string>; mode?: string }> = [];
    const asyncContexts: typeof syncContexts = [];
    const adapter = {
      kind: 'probe',
      lower: (_props: unknown, context: Parameters<NonNullable<InputEmbedAdapter<unknown>['lower']>>[1]) => {
        syncContexts.push({ id: context.id, identityPath: context.identityPath, mode: context.theme?.mode });
        return contribution(context.id);
      },
      prepare: (_props: unknown, context: Parameters<NonNullable<InputEmbedAdapter<unknown>['prepare']>>[1]) => {
        asyncContexts.push({ id: context.id, identityPath: context.identityPath, mode: context.theme?.mode });
        return { execute: () => contribution(context.id) };
      },
    };
    const input: InputScene = {
      layers: [
        {
          type: 'layer',
          id: 'front',
          zIndex: 2,
          children: [
            {
              type: 'scope',
              id: 'container',
              theme: { mode: 'dark' },
              children: [{ type: 'embed', kind: 'probe', props: {} }],
            },
          ],
        },
        {
          type: 'layer',
          id: 'back',
          zIndex: 1,
          children: [
            { type: 'embed', kind: 'probe', props: {} },
            { type: 'embed', kind: 'probe', props: {} },
          ],
        },
      ],
    };
    const sync = processToStaticInputResult(input, { adapters: [adapter] });
    const asynchronous = await processToStaticInputResultAsync(input, { adapters: [adapter] });
    expect(asyncContexts).toEqual(syncContexts);
    expect(asynchronous.scene).toEqual(sync.scene);
    expect([...asynchronous.runtimeMeta.identityIndex]).toEqual([...sync.runtimeMeta.identityIndex]);
  });

  it('disposes on lifecycle cancellation and prevents late ignored-signal results from publishing', async () => {
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
    const controller = await createProcessingControllerAsync(source(), { adapters: [adapter], signal: abort.signal });
    let publications = 0;
    controller.subscribe(() => {
      publications++;
    });
    const pending = controller.update(source(1));
    await new Promise(resolve => setTimeout(resolve, 0));
    abort.abort();
    complete?.(contribution('__retikz-embed:default:children[0]:async-node', 1));
    expect(await pending).toEqual({ kind: 'superseded' });
    expect(publications).toBe(0);
    await expect(controller.update(source())).rejects.toBeInstanceOf(RetikzVanillaError);
    expect(() => controller.subscribe(() => undefined)).toThrow(/disposed/);
  });
  it('prepares the entire authoring tree before any contribution executes', async () => {
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
      processToStaticInputResultAsync(
        { children: [...source(1).children, ...source(2).children] },
        { adapters: [adapter] },
      ),
    ).rejects.toThrow(/unsupported/);
    expect(calls).toEqual(['prepare:1', 'prepare:2']);
  });

  it('uses the same anonymous identity, theme and nested authoring contribution in synchronous and async paths', async () => {
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
      theme: { mode: 'dark' },
      children: [{ type: 'embed', kind: 'container', props: { children: source(4).children } }],
    };
    const sync = processToStaticInputResult(input, { adapters: [outer, inner] });
    const asyncResult = await processToStaticInputResultAsync(input, { adapters: [outer, inner] });
    expect(asyncResult.scene).toEqual(sync.scene);
    expect(asyncResult.runtimeMeta.layers).toEqual(sync.runtimeMeta.layers);
    expect([...asyncResult.runtimeMeta.identityIndex]).toEqual([...sync.runtimeMeta.identityIndex]);
    expect([...asyncResult.runtimeMeta.parentIndex]).toEqual([...sync.runtimeMeta.parentIndex]);
  });

  it('makes discard and commit mutually exclusive terminal states', async () => {
    const adapter = {
      kind: 'async-node',
      prepare: (props: { x: number }, context: { id: string }) => ({
        execute: () => contribution(context.id, props.x),
      }),
    };
    const discarded = await prepareStaticProcessingAsync(source(), { adapters: [adapter] }, 3);
    discarded.discard();
    discarded.discard();
    expect(() => discarded.commit()).toThrow(/discard|terminal/);
    const committed = await prepareStaticProcessingAsync(source(), { adapters: [adapter] }, 4);
    committed.commit();
    committed.commit();
    expect(() => committed.discard()).toThrow(/commit|terminal/);
    const abort = new AbortController();
    const cancelled = await prepareStaticProcessingAsync(source(), { adapters: [adapter], signal: abort.signal }, 5);
    abort.abort();
    expect(() => cancelled.commit()).toThrow(/cancel|abort|invalid/);
    cancelled.discard();
  });

  it('consumes candidate commit before reentrant driver callbacks', async () => {
    let commits = 0;
    let discardCause: unknown;
    const candidate: Awaited<ReturnType<typeof prepareStaticProcessingAsync>> = await prepareStaticProcessingAsync(
      { children: [] },
      {
        compileDriver: {
          create: () => ({
            observers: [],
            resolve: output => ({
              primary: output.result,
              observerOutputs: output.observerOutputs,
              layers: [],
              diagnostics: [],
            }),
            commit: () => {
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

  it('publishes only the current complete update and preserves committed revisions on failure', async () => {
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
    const controller = await createProcessingControllerAsync(source(), { adapters: [adapter] });
    const published: Array<number> = [];
    controller.subscribe(result => published.push(result.revision));
    const old = controller.update(source(1));
    await new Promise(resolve => setTimeout(resolve, 0));
    const next = controller.update(source(2));
    await new Promise(resolve => setTimeout(resolve, 0));
    completions.get(2)?.resolve(contribution('__retikz-embed:default:children[0]:async-node', 2));
    expect((await next).kind).toBe('committed');
    completions.get(1)?.reject(new Error('late error'));
    expect(await old).toEqual({ kind: 'superseded' });
    expect(controller.diagnostics()).toEqual([]);
    const failed = controller.update(source(3));
    await new Promise(resolve => setTimeout(resolve, 0));
    completions.get(3)?.reject(new Error('current error'));
    await expect(failed).rejects.toThrow(/current error/);
    expect(controller.read().revision).toBe(1);
    expect(published).toEqual([1]);
    expect(controller.diagnostics()).toHaveLength(1);
    controller.dispose();
  });
});
