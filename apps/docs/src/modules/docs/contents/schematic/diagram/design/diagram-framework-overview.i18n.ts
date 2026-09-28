import type { Lang } from '@/i18n';

/** 完整图形各区域的说明文字 */
export const diagramFrameworkOverviewI18n: Record<
  Lang,
  {
    title: string;
    description: string;
    drawing: string;
    detail: string;
    legend: string;
    content: string;
  }
> = {
  zh: {
    title: '系统流程图',
    description: '说明区域：标题、说明与显式图例',
    drawing: '绘图内容',
    detail: '由具体 Diagram 组件提供',
    legend: '图例',
    content: '领域内容',
  },
  en: {
    title: 'System flow',
    description: 'Presentation: title, description, and explicit legend',
    drawing: 'Drawing content',
    detail: 'Provided by a concrete Diagram component',
    legend: 'Legend',
    content: 'Domain content',
  },
};
