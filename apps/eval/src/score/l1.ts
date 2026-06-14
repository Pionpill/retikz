import { type Scene, SceneSchema, compileToScene } from '@retikz/core';

/** L1 打分结果：两层（zod / compile）布尔 + 首个失败的归因；compile 通过时带出 scene 供 L2 复用 */
export type L1Result = {
  zodOk: boolean;
  compileOk: boolean;
  failure?: { stage: 'zod' | 'compile'; reason: string };
  scene?: Scene;
};

/**
 * L1 结构有效性打分：
 *  1) 过 SceneSchema（zod safeParse）
 *  2) 过 compileToScene（默认回落 fallbackMeasurer，node 端无需 DOM）
 * 任一失败即记 stage + reason，后续层不再尝试；通过则带出编译好的 scene。
 */
export const scoreL1 = (candidate: unknown): L1Result => {
  const parsed = SceneSchema.safeParse(candidate);
  if (!parsed.success) {
    return {
      zodOk: false,
      compileOk: false,
      failure: { stage: 'zod', reason: parsed.error.issues[0]?.message ?? 'zod parse failed' },
    };
  }

  try {
    const scene = compileToScene(parsed.data);
    return { zodOk: true, compileOk: true, scene };
  } catch (err) {
    return {
      zodOk: true,
      compileOk: false,
      failure: { stage: 'compile', reason: err instanceof Error ? err.message : String(err) },
    };
  }
};
