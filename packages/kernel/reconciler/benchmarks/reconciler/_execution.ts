import type { IRNode, IRScene, ScenePrimitive } from '@retikz/core';
import type { CompileOptions, CompileResult } from '@retikz/reconciler';
import { SceneReconciler } from '@retikz/reconciler';
import { expect } from 'vitest';

/** 真实协调器输入及独立的计时外输出断言 */
export type ReconcilerBenchmarkWorkload = {
  ir: IRScene;
  verify: (result: CompileResult) => void;
};

/** 专项固定几何：80×40，无 ID、正文、标签和资源 */
export const createBenchmarkNode = (index: number): IRNode => ({
  type: 'node',
  shape: 'rectangle',
  position: [(index % 20) * 500, Math.floor(index / 20) * 300],
  layout: { width: 80, minimumSize: { width: 80, height: 40 }, padding: 0, margin: 0 },
  style: { fill: '#ffffff', stroke: '#334155', font: { size: 10 } },
});

/** 展平 Scene 容器；箭头 marker 单独由 Path 用例校验，不混入主体数量 */
export const inspectBenchmarkScene = (result: CompileResult) => {
  const leaves: Array<Exclude<ScenePrimitive, { type: 'group' }>> = [];
  const groups: Array<Extract<ScenePrimitive, { type: 'group' }>> = [];
  const owners = new Map<ScenePrimitive, string | undefined>();
  const visit = (primitives: ReadonlyArray<ScenePrimitive>, inheritedId?: string): void => {
    for (const primitive of primitives) {
      const owner = primitive.id ?? inheritedId;
      if (primitive.type === 'group') {
        groups.push(primitive);
        visit(primitive.children, owner);
      } else {
        leaves.push(primitive);
        owners.set(primitive, owner);
      }
    }
  };
  visit(result.scene.primitives);
  return { leaves, groups, owners };
};

/** 输入与通用输出不变量；不通过额外编译生成预期值 */
export const createBenchmarkWorkload = (
  children: IRScene['children'],
  verify: ReconcilerBenchmarkWorkload['verify'],
): ReconcilerBenchmarkWorkload => {
  const ir: IRScene = { type: 'scene', version: 1, children };
  const before = JSON.stringify(ir);
  return {
    ir,
    verify: result => {
      expect(JSON.stringify(ir)).toBe(before);
      expect(result.artifacts).toEqual([]);
      for (const coordinate of Object.values(result.scene.layout)) expect(Number.isFinite(coordinate)).toBe(true);
      const resources = new Set(result.scene.resources?.map(resource => resource.id));
      for (const primitive of inspectBenchmarkScene(result).leaves) {
        for (const paint of [
          'fill' in primitive ? primitive.fill : undefined,
          'stroke' in primitive ? primitive.stroke : undefined,
        ]) {
          if (paint && typeof paint === 'object' && paint.kind === 'resourceRef')
            expect(resources.has(paint.id)).toBe(true);
        }
      }
      verify(result);
    },
  };
};

/** 创建一次完整执行的采样回调；每个样本新建协调器，不跨样本保存缓存 */
export const createReconcilerBenchmark = (workload: ReconcilerBenchmarkWorkload) => {
  let warningCount = 0;
  const options: CompileOptions = {
    measureText: (text, font) => ({
      width: (text.length * font.size) / 2,
      height: font.size,
      ascent: font.size * 0.8,
      descent: font.size * 0.2,
    }),
    onWarn: () => {
      warningCount++;
    },
  };
  return {
    run: (): CompileResult => {
      const reconciler = new SceneReconciler(options, { incremental: false });
      try {
        return reconciler.mount(workload.ir).compilation.result;
      } finally {
        reconciler.dispose();
      }
    },
    verify: (result: CompileResult): void => {
      expect(warningCount).toBe(0);
      workload.verify(result);
    },
  };
};
