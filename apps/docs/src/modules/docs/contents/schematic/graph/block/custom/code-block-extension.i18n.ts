import type { Lang } from '@/i18n';

/** Visible content shared by the example in both languages. */
export const codeBlockExtensionI18n: Record<Lang, { description: string; title: string; steps: Array<string> }> = {
  zh: { description: '应用服务', title: '职责', steps: ['读取实体事实', '生成结构化内容', '下沉为基础 Block'] },
  en: {
    description: 'Application service',
    title: 'Responsibility',
    steps: ['Read entity facts', 'Compose structured content', 'Lower to a base Block'],
  },
};
