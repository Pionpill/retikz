/** 单次同步公开调用的逐样本墙钟时间，单位 ms */
type Frame = { total: number; compute: number; render: number; other: number };
let frame: Frame | undefined;
let computeStart: number | undefined;
let renders = 0;

/** 仅在 integration 的正式操作（含预热）内打开编译探针 */
export const startCompute = () => {
  if (frame) computeStart = performance.now();
};
export const endCompute = () => {
  if (frame && computeStart !== undefined) {
    frame.compute += performance.now() - computeStart;
    computeStart = undefined;
  }
};
/** 包围真实 Render 调用，不包括测试驱动及验证 */
export const timeRender = <T>(run: () => T): T => {
  if (!frame) return run();
  const start = performance.now();
  try {
    return run();
  } finally {
    frame.render += performance.now() - start;
    renders++;
  }
};
/** 快照始终来自同一次调用；异常不保留半个样本 */
export const measureOperation = <T>(run: () => T, samples: Array<Frame>): T => {
  const sample = { total: 0, compute: 0, render: 0, other: 0 };
  frame = sample;
  renders = 0;
  computeStart = undefined;
  const start = performance.now();
  try {
    const result = run();
    sample.total = performance.now() - start;
    sample.other = sample.total - sample.compute - sample.render;
    if (sample.compute <= 0 || !renders || sample.other < -1e-6)
      throw new Error('Missing or overlapping integration timing boundary');
    sample.other = Math.max(0, sample.other);
    samples.push(sample);
    return result;
  } finally {
    frame = undefined;
  }
};
