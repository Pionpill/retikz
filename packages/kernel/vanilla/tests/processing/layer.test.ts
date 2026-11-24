import { ReconcilerMode } from '@retikz/reconciler';
import { describe, expect, it, vi } from 'vitest';

import {
  compileToScene,
  scope,
  embed,
  normalizeScene,
  compileLayers,
  LayerStack,
  layer,
  layerFromInput,
  node,
  path,
  scene,
} from '../../src';

const contents = (name: string, x: number) =>
  layerFromInput({ name, scene: scene({ children: [node({ id: 'box', position: [x, 0] })] }) });
const source = () => [
  contents('overlay', 40),
  layer({ name: 'background', scene: normalizeScene(scene([node({ id: 'box', position: [0, 0] })])).ir }),
];
describe('独立图层会话', () => {
  it('整栈替换失败时保留已发布的快照，不通知已编译的兄弟层', () => {
    const stack = new LayerStack(source());
    const previous = stack.current;
    const listener = vi.fn();
    stack.subscribe(listener);
    const failing = layerFromInput({
      name: 'second',
      scene: scene([node({ position: [0, 0], shape: 'missing-shape' })]),
    });
    try {
      expect(() => stack.replace([contents('first', 1), failing])).toThrow();
      expect(stack.current).toBe(previous);
      expect(listener).not.toHaveBeenCalled();
    } finally {
      stack.dispose();
    }
  });

  it('静态编译不丢失没有 main 的层', () => {
    const compiled = compileLayers(source());
    expect(compiled.map(entry => entry.name)).toEqual(['background', 'overlay']);
    expect(compileLayers([])).toEqual([]);
  });
  it('整栈替换重建同名会话，按新声明顺序一次发布并释放旧层', () => {
    const stack = new LayerStack(source());
    try {
      const overlay = stack.get('overlay');
      const background = stack.get('background');
      const listener = vi.fn();
      stack.subscribe(listener);
      stack.replace([contents('other', 10), { ...contents('overlay', 20), zIndex: 10 }]);
      expect(stack.current.map(entry => entry.name)).toEqual(['other', 'overlay']);
      expect(listener).toHaveBeenCalledExactlyOnceWith(stack.current);
      expect(stack.get('overlay')).not.toBe(overlay);
      expect(() => overlay.replaceInput(scene([]))).toThrow(/disposed/i);
      expect(() => background.replaceInput(scene([]))).toThrow(/disposed/i);
      expect(() => stack.get('background')).toThrow(/Unknown layer/);
    } finally {
      stack.dispose();
    }
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

    const layers = ['left', 'right'].map(name => layerFromInput({ name, scene: drawing }));
    expect(paths).toEqual([expectedPath, expectedPath, expectedPath]);
    for (const { result } of compileLayers(layers)) expect(result.scene).toEqual(standalone.scene);
    const stack = new LayerStack(layers);
    try {
      const [left] = stack.current;
      stack.replaceLayer(layers[1]);
      expect(stack.current[0]).toBe(left);
      expect(stack.current[1].result.compilation.result.scene).toEqual(standalone.scene);
      expect(paths).toEqual([expectedPath, expectedPath, expectedPath]);
    } finally {
      stack.dispose();
    }
  });
  it('只替换指定层，重排序不重算，旧批次不能用于重建后的会话', () => {
    const stack = new LayerStack(source(), { reconciler: { mode: ReconcilerMode.Incremental } });
    try {
      const [background, overlay] = stack.current;
      expect(() => stack.get('background').update({ operations: [] }, background.result)).toThrow(/incremental/);
      stack.replaceLayer(contents('overlay', 80));
      const updated = stack.current;
      expect(updated[0]).toBe(background);
      expect(updated[1].result).not.toBe(overlay.result);
      expect(() => stack.get('overlay').update({ operations: [] }, overlay.result)).toThrow(/stale/i);
      stack.setLayerOrder('overlay', -1);
      expect(stack.current.map(entry => entry.result)).toEqual([updated[1].result, background.result]);
      stack.removeLayer('background');
      expect(stack.current.map(entry => entry.name)).toEqual(['overlay']);
    } finally {
      stack.dispose();
    }
  });
  it('按本层地址删除同名图元，不改变背景版本', () => {
    const stack = new LayerStack(source(), { reconciler: { mode: ReconcilerMode.Incremental } });
    try {
      const [background, overlay] = stack.current;
      const scopeId = stack.get('overlay').getScopeId([], overlay.result);
      stack
        .get('overlay')
        .update({ operations: [{ kind: 'remove', target: { kind: 'id', scopeId, id: 'box' } }] }, overlay.result);
      expect(stack.current[0]).toBe(background);
      expect(stack.current[1].result.compilation.result.scene.primitives).toHaveLength(0);
      expect(() => stack.get('overlay').getScopeId([], overlay.result)).toThrow(/stale/i);
    } finally {
      stack.dispose();
    }
  });
  it('层替换不提交兄弟层', () => {
    const stack = new LayerStack(source());
    try {
      const previous = stack.current;
      const overlay = stack.get('overlay');
      const listener = vi.fn();
      stack.subscribe(listener);
      stack.replaceLayer({ ...contents('overlay', 60), zIndex: 101 });
      expect(stack.get('overlay')).toBe(overlay);
      expect(listener).toHaveBeenCalledExactlyOnceWith(stack.current);
      expect(stack.current[1]).toMatchObject({ zIndex: 101, result: overlay.current });
      expect(stack.current[0]).toBe(previous[0]);
      expect(stack.current[1]).not.toBe(previous[1]);

      overlay.replaceInput(scene([]));
      expect(listener).toHaveBeenCalledTimes(2);
      expect(stack.current[1].result).toBe(overlay.current);
      expect(stack.current[0]).toBe(previous[0]);
      stack.removeLayer('overlay');
      expect(() => overlay.replaceInput(scene([]))).toThrow(/disposed/i);
      expect(() => stack.get('overlay')).toThrow(/Unknown layer/);
    } finally {
      stack.dispose();
    }
  });
  it('替换已有层时使用该次配置，移除覆盖后恢复层栈配置', () => {
    const stackWarning = vi.fn();
    const layerWarning = vi.fn();
    const stack = new LayerStack([contents('overlay', 0)], { compile: { onWarn: stackWarning } });
    const next = layerFromInput({ name: 'overlay', scene: scene([path({ way: [[0, 0], 'missing'] })]) });
    try {
      stack.replaceLayer({ ...next, config: { compile: { onWarn: layerWarning } } });
      expect(layerWarning).toHaveBeenCalledOnce();
      expect(stackWarning).not.toHaveBeenCalled();
      const beforeReset = stack.get('overlay');
      beforeReset.replaceInput(scene([path({ way: [[0, 0], 'missing'] })]));
      expect(layerWarning).toHaveBeenCalledTimes(2);
      stack.replaceLayer(next);
      expect(stackWarning).toHaveBeenCalledOnce();
      expect(layerWarning).toHaveBeenCalledTimes(2);
      expect(() => beforeReset.replaceInput(scene([]))).toThrow(/disposed/i);
    } finally {
      stack.dispose();
    }
  });

  it('新增层编译期间销毁层栈，不发布尚未挂载的层', () => {
    const stack = new LayerStack([contents('main', 0)]);
    const previous = stack.current;
    const listener = vi.fn();
    stack.subscribe(listener);
    const next = layerFromInput({
      name: 'overlay',
      config: { compile: { onWarn: () => stack.dispose() } },
      scene: scene([path({ way: [[0, 0], 'missing'] })]),
    });
    expect(() => stack.replaceLayer(next)).toThrow(/disposed/i);
    expect(stack.current).toBe(previous);
    expect(listener).not.toHaveBeenCalled();
  });
  it('兄弟层的锚点不参与本层解析，警告仅交给本层回调', () => {
    const commonWarning = vi.fn();
    const layerWarning = vi.fn();
    compileLayers(
      [
        contents('main', 42),
        layerFromInput({
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
    const stack = new LayerStack(source(), { reconciler: { mode: ReconcilerMode.Incremental } });
    try {
      const previous = stack.current;
      const entry = previous[1];
      const scopeId = stack.get(entry.name).getScopeId([], entry.result);
      const listener = vi.fn();
      stack.subscribe(listener);
      expect(() =>
        stack.get(entry.name).update(
          {
            operations: [{ kind: 'remove', target: { kind: 'id', scopeId, id: 'missing' } }],
          },
          entry.result,
        ),
      ).toThrow();
      expect(stack.current).toBe(previous);
      expect(listener).not.toHaveBeenCalled();
    } finally {
      stack.dispose();
    }
  });

  it('背景可以显式覆盖全量预设，空批次不会发布结果', () => {
    const stack = new LayerStack([
      layerFromInput({
        name: 'background',
        config: { reconciler: { mode: ReconcilerMode.Incremental } },
        scene: scene([]),
      }),
    ]);
    try {
      const previous = stack.current;
      stack.get('background').update({ operations: [] }, previous[0].result);
      expect(stack.current).toBe(previous);
    } finally {
      stack.dispose();
    }
  });
});
