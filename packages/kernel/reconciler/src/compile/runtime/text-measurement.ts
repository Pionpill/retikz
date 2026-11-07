import type { TextMeasurer, TextMetrics } from '@retikz/core';
import { guardProviderOutput } from '@retikz/core';

/** 为一次编译执行缓存文字度量，子树及试算共享，下一次执行重新创建 */
export const createCompileTextMeasurer = (measureText: TextMeasurer): TextMeasurer => {
  const measurements = new Map<string, TextMetrics>();

  return (text, font, disableCache = false) => {
    if (disableCache) return measureText(text, font, true);

    const { size, family, weight, style } = font;
    const key = JSON.stringify([text, size, family, weight, style]);
    let metrics = measurements.get(key);
    if (metrics === undefined) {
      const measured = measureText(text, font, false);
      metrics = guardProviderOutput('TextMeasurer', () => {
        const { width, height, ascent, descent } = measured;
        return { width, height, ascent, descent };
      });
      measurements.set(key, metrics);
    }

    // 宿主或消费者复用、修改度量对象时，不改变本次已缓存的事实
    return { ...metrics };
  };
};
