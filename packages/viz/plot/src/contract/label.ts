import type { IRPlotChannel, IRPlotLabelEncoding } from '../schemas';

/** 将字符串内容简写和单项／数组统一为保留索引的标签列表 */
export const labelEntries = <T extends { content?: unknown }>(
  source: T | string | ReadonlyArray<T | string> | undefined,
): Array<T | { content: string }> => {
  if (source === undefined) return [];
  const entries = Array.isArray(source) ? source : [source];
  return entries.map(entry => (typeof entry === 'string' ? { content: entry } : entry));
};

/** 展开已声明的字体叶子与单值编码，不递归推断任意配置对象 */
export const labelEncodingBindings = (label: IRPlotLabelEncoding): Array<[string, IRPlotChannel]> => {
  const bindings: Array<[string, IRPlotChannel]> = [];
  for (const [target, binding] of Object.entries<IRPlotLabelEncoding[string] | undefined>(label)) {
    if (binding === undefined || target === 'content') continue;
    if (target === 'font') {
      for (const [leaf, field] of Object.entries<IRPlotChannel | undefined>(label.font ?? {})) {
        if (field !== undefined) bindings.push([`font.${leaf}`, field]);
      }
    } else bindings.push([target, binding as IRPlotChannel]);
  }
  return bindings;
};
