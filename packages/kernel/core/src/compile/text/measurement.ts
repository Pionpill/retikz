import type { TextMeasurer } from './metrics';
import { resolveTextMetrics } from './metrics';
import type { CanonicalTextMetrics } from './metrics';

/** 创建独占的规范化文本测量缓存，不跨编译共享 */
export const createTextMeasurement = (measurer: TextMeasurer): TextMeasurer => {
  const measuredText = new Map<string, Readonly<CanonicalTextMetrics>>();
  const measureText: TextMeasurer = (text, font) => {
    const key = JSON.stringify([text, font.family, font.size, font.weight, font.style]);
    const cached = measuredText.get(key);
    if (cached !== undefined) {
      measuredText.delete(key);
      measuredText.set(key, cached);
      return cached;
    }
    const result = Object.freeze(resolveTextMetrics(measurer(text, font)));
    measuredText.set(key, result);
    if (measuredText.size > 4096) measuredText.delete(measuredText.keys().next().value!);
    return result;
  };
  return measureText;
};
