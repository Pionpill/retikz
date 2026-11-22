import { ReconcilerMode } from '@retikz/reconciler';
import { describe, expect, it, vi } from 'vitest';

import type { VanillaCompileResultExtensionSession } from '../../src';
import {
  compileToScene,
  compileToSceneAsync,
  createProcessingController,
  createProcessingControllerAsync,
  layer,
  node,
  path,
  scene,
} from '../../src';

const contents = (name: string, x: number) => layer({ name, children: [node({ id: 'box', position: [x, 0] })] });
const source = () => scene({ layers: [contents('overlay', 40), contents('background', 0)] });
describe('独立图层会话', () => {
  it('整栈和单层提交的扩展回调均可读取已安装的新层', () => {
    const observed: Array<boolean> = [];
    const observe = vi.fn<NonNullable<VanillaCompileResultExtensionSession['onCommit']>>();
    const session: VanillaCompileResultExtensionSession = {
      resolve: () => [],
      onCommit: observe,
    };
    const controller = createProcessingController(source(), { compileResultExtension: { create: () => session } });
    observe.mockImplementation(output => {
      observed.push(controller.read().some(entry => entry.result.compileResult === output.primary));
    });
    try {
      controller.update(scene({ layers: [contents('new', 3)] }));
      controller.replaceLayer(contents('new', 5));
      controller.replaceLayer(contents('extra', 7));
      expect(observed).toEqual([true, true, true]);
    } finally {
      controller.dispose();
    }
  });

  it('静态和异步入口不丢失没有 main 的层', async () => {
    const compiled = compileToScene(source());
    const asynchronous = await compileToSceneAsync(source());
    expect(compiled.map(entry => entry.name)).toEqual(['background', 'overlay']);
    expect(asynchronous.map(entry => entry.result.compileResult.scene)).toEqual(
      compiled.map(entry => entry.result.compileResult.scene),
    );
    expect(compileToScene(scene({ layers: [] }))).toEqual([]);
  });
  it('只替换指定层，重排序不重算，旧批次不能用于重建后的会话', () => {
    const controller = createProcessingController(source(), { reconciler: { mode: ReconcilerMode.Incremental } });
    try {
      const [background, overlay] = controller.read();
      expect(() => controller.updateLayer('background', { operations: [] }, background.result)).toThrow(/incremental/);
      controller.replaceLayer(contents('overlay', 80));
      const updated = controller.read();
      expect(updated[0]).toBe(background);
      expect(updated[1].result).not.toBe(overlay.result);
      expect(() => controller.updateLayer('overlay', { operations: [] }, overlay.result)).toThrow(/stale/i);
      controller.setLayerOrder('overlay', -1);
      expect(controller.read().map(entry => entry.result)).toEqual([updated[1].result, background.result]);
      controller.removeLayer('background');
      expect(controller.read().map(entry => entry.name)).toEqual(['overlay']);
    } finally {
      controller.dispose();
    }
  });
  it('按本层地址删除同名图元，不改变背景版本', () => {
    const controller = createProcessingController(source(), { reconciler: { mode: ReconcilerMode.Incremental } });
    try {
      const [background, overlay] = controller.read();
      const scopeId = controller.getScopeId('overlay', [], overlay.result);
      controller.updateLayer(
        'overlay',
        { operations: [{ kind: 'remove', target: { kind: 'id', scopeId, id: 'box' } }] },
        overlay.result,
      );
      expect(controller.read()[0]).toBe(background);
      expect(controller.read()[1].result.compileResult.scene.primitives).toHaveLength(0);
      expect(() => controller.getScopeId('overlay', [], overlay.result)).toThrow(/stale/i);
    } finally {
      controller.dispose();
    }
  });
  it('整栈订阅发起的异步单层更新继承新栈的作者配置', async () => {
    const roots: Array<unknown> = [];
    const session: VanillaCompileResultExtensionSession = {
      resolve: () => [],
    };
    const controller = await createProcessingControllerAsync(
      { ...source(), authoring: 'initial' },
      {
        compileResultExtension: {
          create: input => {
            roots.push(input.authoringSites.find(site => site.kind === 'scene')?.authoring);
            return session;
          },
        },
      },
    );
    try {
      let pending: ReturnType<typeof controller.replaceLayer> | undefined;
      const unsubscribe = controller.subscribe(() => {
        unsubscribe();
        pending = controller.replaceLayer(contents('overlay', 80));
      });
      await controller.update({ ...source(), authoring: 'updated' });
      expect(await pending).toMatchObject({ kind: 'committed' });
      expect(roots.at(-1)).toBe('updated');
    } finally {
      controller.dispose();
    }
  });

  it('异步层替换不提交兄弟层', async () => {
    const controller = await createProcessingControllerAsync(source());
    try {
      const previous = controller.read();
      const update = await controller.replaceLayer(contents('overlay', 60));
      expect(update.kind).toBe('committed');
      expect(controller.read()[0]).toBe(previous[0]);
      expect(controller.read()[1]).not.toBe(previous[1]);
    } finally {
      controller.dispose();
    }
  });
  it('兄弟层的锚点不参与本层解析，警告仅交给本层回调', () => {
    const commonWarning = vi.fn();
    const layerWarning = vi.fn();
    compileToScene(
      scene({
        layers: [
          contents('main', 42),
          layer({ name: 'overlay', compile: { onWarn: layerWarning }, children: [path({ way: [[0, 0], 'box'] })] }),
        ],
      }),
      { compile: { onWarn: commonWarning } },
    );
    expect(layerWarning).toHaveBeenCalledWith(expect.objectContaining({ code: 'UNRESOLVED_NODE_REFERENCE' }));
    expect(commonWarning).not.toHaveBeenCalled();
  });

  it('失败批次保留最后成功结果，不发布兄弟层或目标层的新版本', () => {
    const controller = createProcessingController(source(), { reconciler: { mode: ReconcilerMode.Incremental } });
    try {
      const previous = controller.read();
      const entry = previous[1];
      const scopeId = controller.getScopeId(entry.name, [], entry.result);
      const listener = vi.fn();
      controller.subscribe(listener);
      expect(() =>
        controller.updateLayer(
          entry.name,
          {
            operations: [{ kind: 'remove', target: { kind: 'id', scopeId, id: 'missing' } }],
          },
          entry.result,
        ),
      ).toThrow();
      expect(controller.read()).toBe(previous);
      expect(listener).not.toHaveBeenCalled();
    } finally {
      controller.dispose();
    }
  });

  it('同层异步请求只提交最新值，不取消另一层的更新', async () => {
    const controller = await createProcessingControllerAsync(source());
    try {
      const stale = controller.replaceLayer(contents('overlay', 1));
      const background = controller.replaceLayer(contents('background', 2));
      const latest = controller.replaceLayer(contents('overlay', 3));
      const outcomes = await Promise.all([stale, background, latest]);
      expect(outcomes.map(outcome => outcome.kind)).toEqual(['superseded', 'committed', 'committed']);
      expect(controller.read().map(entry => entry.result.revision)).toEqual([1, 1]);
    } finally {
      controller.dispose();
    }
  });

  it('背景可以显式覆盖全量预设，空批次不会发布结果', () => {
    const controller = createProcessingController(
      scene({
        layers: [layer({ name: 'background', reconciler: { mode: ReconcilerMode.Incremental }, children: [] })],
      }),
    );
    try {
      const previous = controller.read();
      controller.updateLayer('background', { operations: [] }, previous[0].result);
      expect(controller.read()).toBe(previous);
    } finally {
      controller.dispose();
    }
  });
});
