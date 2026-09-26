import type { Lang } from '@/i18n';

/** List 引用边界与容器标签示意图的双语文字 */
export const listReferenceFigureI18n: Record<Lang, { content: string; label: string; reference: string }> = {
  zh: {
    content: 'ABCDEFGHIJKLMN',
    label: '容器标签',
    reference: '单格引用边界',
  },
  en: {
    content: 'ABCDEFGHIJKLMN',
    label: 'Container label',
    reference: 'Cell reference bounds',
  },
};
