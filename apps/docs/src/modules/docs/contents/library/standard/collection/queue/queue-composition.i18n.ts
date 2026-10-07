import type { Lang } from '@/i18n';

/** 图形与控件文案 */
export const queueI18n: Record<Lang, { title: string; matrix: string; dashed: string; connect: string }> = {
  zh: { title: '嵌套内容与单格引用', matrix: '嵌入 Matrix', dashed: '单格虚线无填充', connect: '外部连接' },
  en: {
    title: 'Compose content and references',
    matrix: 'Embed Matrix',
    dashed: 'Dashed cell without fill',
    connect: 'External connection',
  },
};
