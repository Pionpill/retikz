import type { Lang } from '@/i18n';

/** 输入隔离示意图的文案 */
export const sourceValuesI18n: Record<
  Lang,
  { input: string; value: string; read: string; capture: string; expose: string }
> = {
  zh: {
    input: "表单输入 · 字符串\n{ x: '10', y: '20' }",
    value: '内部元组 · [x, y]\n[10, 20]',
    read: '只读元组 · [x, y]\n[10, 20]',
    capture: '转为数值',
    expose: '复制并冻结',
  },
  en: {
    input: "Form input · strings\n{ x: '10', y: '20' }",
    value: 'Internal tuple · [x, y]\n[10, 20]',
    read: 'Read-only tuple · [x, y]\n[10, 20]',
    capture: 'Convert to numbers',
    expose: 'Copy and freeze',
  },
};
