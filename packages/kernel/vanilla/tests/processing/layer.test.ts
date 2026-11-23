import { ReconcilerMode } from '@retikz/reconciler';
import { describe, expect, it, vi } from 'vitest';

import {
  compileToScene,
  scope,
  embed,
  normalizeScene,
  compileLayers,
  createLayerController,
  layer,
  node,
  path,
  scene,
} from '../../src';

const contents = (name: string, x: number) =>
  layer({ name, scene: scene({ children: [node({ id: 'box', position: [x, 0] })] }) });
const source = () => [
  contents('overlay', 40),
  layer({ name: 'background', scene: normalizeScene(scene([node({ id: 'box', position: [0, 0] })])).ir }),
];
describe('独立图层会话', () => {
  it('整栈替换失败时保留已发布的快照，不通知已编译的兄弟层', () => {
    const controller = createLayerController(source());
    const previous = controller.read();
    const listener = vi.fn();
    controller.subscribe(listener);
    const failing = layer({
      name: 'second',
      scene: scene([
        embed({
          adapter: {
            kind: 'broken',
            lower: () => {
              throw new Error('failed layer');
            },
          },
          props: {},
        }),
      ]),
    });
    try {
      expect(() => controller.update([contents('first', 1), failing])).toThrow();
      expect(controller.read()).toBe(previous);
      expect(listener).not.toHaveBeenCalled();
    } finally {
      controller.dispose();
    }
  });

  it('静态编译不丢失没有 main 的层', () => {
    const compiled = compileLayers(source());
    expect(compiled.map(entry => entry.name)).toEqual(['background', 'overlay']);
    expect(compileLayers([])).toEqual([]);
  });
  it('同一场景在单图、不同层和同层替换时保留相同的嵌入身份', () => {
    const paths: Array<Array<string>> = [];
    const ids: Array<string> = [];
    const drawing = scene([
      scope({ id: 'group' }, [
        embed({
          adapter: {
            kind: 'probe',
            lower: (_props, context) => {
              paths.push(context.identityPath);
              ids.push(context.id);
              return {
                node: { type: 'node', id: context.id, position: [0, 0] },
                providerDependencies: { roots: [], providers: [] },
              };
            },
          },
          props: {},
        }),
      ]),
    ]);
    const standalone = compileToScene(drawing);
    const expectedPath = ['group', ids[0]];
    expect(paths).toEqual([expectedPath]);

    const layers = ['left', 'right'].map(name => layer({ name, scene: drawing }));
    for (const { result } of compileLayers(layers)) expect(result.scene).toEqual(standalone.scene);
    const controller = createLayerController(layers);
    try {
      const [left] = controller.read();
      controller.replaceLayer(layers[1]);
      expect(controller.read()[0]).toBe(left);
      expect(controller.read()[1].result.compilation.result.scene).toEqual(standalone.scene);
      expect(paths).toEqual(Array(6).fill(expectedPath));
    } finally {
      controller.dispose();
    }
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
      expect(controller.read()[1].result.compilation.result.scene.primitives).toHaveLength(0);
      expect(() => controller.getScopeId('overlay', [], overlay.result)).toThrow(/stale/i);
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
  it('替换已有层时使用该次配置，移除覆盖后恢复层栈配置', () => {
    const stackWarning = vi.fn();
    const layerWarning = vi.fn();
    const controller = createLayerController([contents('overlay', 0)], { compile: { onWarn: stackWarning } });
    const next = layer({ name: 'overlay', scene: scene([path({ way: [[0, 0], 'missing'] })]) });
    try {
      controller.replaceLayer({ ...next, config: { compile: { onWarn: layerWarning } } });
      expect(layerWarning).toHaveBeenCalledOnce();
      expect(stackWarning).not.toHaveBeenCalled();
      controller.replaceLayer(next);
      expect(stackWarning).toHaveBeenCalledOnce();
      expect(layerWarning).toHaveBeenCalledOnce();
    } finally {
      controller.dispose();
    }
  });

  it('新增层归一化期间销毁层栈，不发布尚未挂载的层', () => {
    const controller = createLayerController([contents('main', 0)]);
    const previous = controller.read();
    const listener = vi.fn();
    controller.subscribe(listener);
    const next = layer({
      name: 'overlay',
      scene: scene([
        embed({
          adapter: {
            kind: 'dispose-owner',
            lower: () => {
              controller.dispose();
              return { node: { type: 'scope', children: [] }, providerDependencies: { roots: [], providers: [] } };
            },
          },
          props: {},
        }),
      ]),
    });
    expect(() => controller.replaceLayer(next)).toThrow(/disposed/i);
    expect(controller.read()).toBe(previous);
    expect(listener).not.toHaveBeenCalled();
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
