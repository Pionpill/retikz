import type { Lang } from '@/i18n';

/** Presentation 示例的图内文字与控制面板文案 */
export const flowPresentationI18n: Record<
  Lang,
  {
    controlsTitle: string;
    title: string;
    description: string;
    legend: string;
    heading: string;
    summary: string;
    start: string;
    end: string;
    step: string;
  }
> = {
  zh: {
    controlsTitle: '说明区域',
    title: '显示标题',
    description: '显示说明',
    legend: '显示图例',
    heading: '请求处理',
    summary: '校验通过后保存数据',
    start: '校验',
    end: '保存',
    step: '处理步骤',
  },
  en: {
    controlsTitle: 'Presentation',
    title: 'Show title',
    description: 'Show description',
    legend: 'Show legend',
    heading: 'Request handling',
    summary: 'Validate, then save the data',
    start: 'Validate',
    end: 'Save',
    step: 'Process step',
  },
};
