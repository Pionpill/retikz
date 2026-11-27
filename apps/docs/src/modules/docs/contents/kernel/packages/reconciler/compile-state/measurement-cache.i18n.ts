/** 展示同一测量请求首次试算与再次命中后的两条路径的双语标签 */
export const measurementCacheI18n = {
  zh: {
    first: '首次询问自然宽度',
    probe: '未命中：试算子项',
    write: '写入宽度贡献',
    again: '同条件再次询问',
    hit: '命中：读取贡献',
    read: '直接返回宽度',
  },
  en: {
    first: 'First width request',
    probe: 'Miss: evaluate child',
    write: 'Store width contribution',
    again: 'Repeat the same request',
    hit: 'Hit: read contribution',
    read: 'Return width directly',
  },
} as const;
