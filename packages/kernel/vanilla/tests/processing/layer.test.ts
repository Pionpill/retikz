import { ReconcilerMode } from '@retikz/reconciler';
import { describe, expect, it, vi } from 'vitest';

import type { VanillaCompileResultExtensionSession } from '../../src';
import { normalizeScene, compileLayers, createLayerController, layer, node, path, scene } from '../../src';

const contents = (name: string, x: number, authoring?: unknown) =>
  layer({ name, scene: scene({ authoring, children: [node({ id: 'box', position: [x, 0] })] }) });
const source = () => [
  contents('overlay', 40),
  layer({ name: 'background', scene: normalizeScene(scene([node({ id: 'box', position: [0, 0] })])).ir }),
];
describe('独立图层会话', () => {
  it('整栈和单层提交的扩展回调均可读取已安装的新层', () => {
    const observed: Array<boolean> = [];
    const observe = vi.fn<NonNullable<VanillaCompileResultExtensionSession['onCommit']>>();
    const session: VanillaCompileResultExtensionSession = {
      resolve: () => [],
      onCommit: observe,
    };
    const controller = createLayerController(source(), { compileResultExtension: { create: () => session } });
    observe.mockImplementation(output => {
      observed.push(controller.read().some(entry => entry.result.compileResult === output.primary));
    });
    try {
      controller.update([contents('new', 3)]);
      controller.replaceLayer(contents('new', 5));
      controller.replaceLayer(contents('extra', 7));
      expect(observed).toEqual([true, true, true]);
    } finally {
      controller.dispose();
    }
  });

  it('整栈替换中销毁宿主时保留旧快照，不通知已编译的兄弟层', () => {
    const resolve = vi.fn<VanillaCompileResultExtensionSession['resolve']>(() => []);
    const onCommit = vi.fn();
    const controller = createLayerController(source(), {
      compileResultExtension: { create: () => ({ resolve, onCommit }) },
    });
    const previous = controller.read();
    const listener = vi.fn();
    controller.subscribe(listener);
    onCommit.mockClear();
    resolve
      .mockImplementationOnce(() => [])
      .mockImplementationOnce(() => {
        controller.dispose();
        return [];
      });

    expect(() => controller.update([contents('first', 1), contents('second', 2)])).toThrow();
    expect(controller.read()).toBe(previous);
    expect(onCommit).not.toHaveBeenCalled();
    expect(listener).not.toHaveBeenCalled();
    expect(() => controller.replaceLayer(contents('first', 3))).toThrow(/disposed/);
  });

  it('静态编译不丢失没有 main 的层', () => {
    const compiled = compileLayers(source());
    expect(compiled.map(entry => entry.name)).toEqual(['background', 'overlay']);
    expect(compileLayers([])).toEqual([]);
  });
  it('只替换指定层，重排序不重算，旧批次不能用于重建后的会话', () => {
    const controller = createLayerController(source(), { reconciler: { mode: ReconcilerMode.Incremental } });
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
    const controller = createLayerController(source(), { reconciler: { mode: ReconcilerMode.Incremental } });
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
  it('替换单层只使用本层场景的作者配置', () => {
    const roots: Array<unknown> = [];
    const session: VanillaCompileResultExtensionSession = {
      resolve: () => [],
    };
    const controller = createLayerController([contents('overlay', 1, 'initial')], {
      compileResultExtension: {
        create: input => {
          roots.push(input.authoringSites.find(site => site.kind === 'scene')?.authoring);
          return session;
        },
      },
    });
    try {
      controller.update([contents('overlay', 2, 'updated')]);
      controller.replaceLayer(contents('overlay', 80));
      expect(roots).toEqual(['initial', 'updated', undefined]);
    } finally {
      controller.dispose();
    }
  });

  it('层替换不提交兄弟层', () => {
    const controller = createLayerController(source());
    try {
      const previous = controller.read();
      controller.replaceLayer(contents('overlay', 60));
      expect(controller.read()[0]).toBe(previous[0]);
      expect(controller.read()[1]).not.toBe(previous[1]);
    } finally {
      controller.dispose();
    }
  });
  it('兄弟层的锚点不参与本层解析，警告仅交给本层回调', () => {
    const commonWarning = vi.fn();
    const layerWarning = vi.fn();
    compileLayers(
      [
        contents('main', 42),
        layer({
          name: 'overlay',
          config: { compile: { onWarn: layerWarning } },
          scene: scene([path({ way: [[0, 0], 'box'] })]),
        }),
      ],
      { compile: { onWarn: commonWarning } },
    );
    expect(layerWarning).toHaveBeenCalledWith(expect.objectContaining({ code: 'UNRESOLVED_NODE_REFERENCE' }));
    expect(commonWarning).not.toHaveBeenCalled();
  });

  it('失败批次保留最后成功结果，不发布兄弟层或目标层的新版本', () => {
    const controller = createLayerController(source(), { reconciler: { mode: ReconcilerMode.Incremental } });
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

  it('背景可以显式覆盖全量预设，空批次不会发布结果', () => {
    const controller = createLayerController([
      layer({ name: 'background', config: { reconciler: { mode: ReconcilerMode.Incremental } }, scene: scene([]) }),
    ]);
    try {
      const previous = controller.read();
      controller.updateLayer('background', { operations: [] }, previous[0].result);
      expect(controller.read()).toBe(previous);
    } finally {
      controller.dispose();
    }
  });
});
