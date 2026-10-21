const translations: Partial<Record<string, string>> = {
  '区间固定属性，连接方式省略时复用 schema 默认':
    'Fixed interval properties; omitted connection uses the schema default',
  '路径固定属性，连接方式省略时复用 schema 默认': 'Fixed path properties; omitted connection uses the schema default',
  分面声明标识: 'Facet declaration identifier',
  轨道声明标识: 'Track declaration identifier',
};
const missing = new Set<string>();
/** 翻译标注的公开声明说明 */
export const translatePlotAnnotation = (source: string): string => {
  if (!/[\u3400-\u9fff]/u.test(source)) return source;
  const translated = translations[source];
  if (translated !== undefined) return translated;
  missing.add(source);
  return source;
};
/** 拒绝未翻译的英文参考产物 */
export const assertPlotAnnotationTranslated = (): void => {
  if (missing.size) throw new Error(`Missing annotation translations: ${JSON.stringify([...missing], null, 2)}`);
};
