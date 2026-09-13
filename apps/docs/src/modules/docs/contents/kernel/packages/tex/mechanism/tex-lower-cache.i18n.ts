import type { Lang } from '@/i18n';

/** tex-lower-cache 的本地化文案 */
export type TexLowerCacheI18n = Readonly<{
  label1: string;
  label2: string;
  label3: string;
  label4: string;
  label5: string;
  label6: string;
  label7: string;
  label8: string;
}>;

/** 按文档语言获取 tex-lower-cache 文案 */
export const texLowerCacheI18n: Record<Lang, TexLowerCacheI18n> = {
  zh: {
    label1: 'TeX 请求',
    label2: '缓存查询',
    label3: '缓存内容',
    label4: 'MathJax 处理',
    label5: '解析结果',
    label6: '命中',
    label7: '未命中',
    label8: '加入缓存',
  },
  en: {
    label1: 'TeX request',
    label2: 'Cache lookup',
    label3: 'Cached content',
    label4: 'MathJax processing',
    label5: 'Parsing result',
    label6: 'hit',
    label7: 'miss',
    label8: 'Add to cache',
  },
};
