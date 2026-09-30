import type { Lang } from '@/i18n';

/** 测量阶段示意图的双语文案 */
export const flowMeasurementI18n: Record<
  Lang,
  {
    receive: string;
    verify: string;
    next: string;
    group: string;
    width: string;
    height: string;
    insets: string;
    labelSize: string;
    input: string;
    measure: string;
  }
> = {
  zh: {
    receive: '接收',
    verify: '校验',
    next: '继续',
    group: 'pipeline · Group',
    width: 'width = 80',
    height: 'height = 40',
    insets: 'contentInsets',
    labelSize: 'labelSize',
    input: 'FlowLayoutInput · leaf 字段摘录',
    measure: '尺寸进入布局输入',
  },
  en: {
    receive: 'Receive',
    verify: 'Verify',
    next: 'Next',
    group: 'pipeline · Group',
    width: 'width = 80',
    height: 'height = 40',
    insets: 'contentInsets',
    labelSize: 'labelSize',
    input: 'FlowLayoutInput · leaf excerpt',
    measure: 'Sizes enter layout input',
  },
};
