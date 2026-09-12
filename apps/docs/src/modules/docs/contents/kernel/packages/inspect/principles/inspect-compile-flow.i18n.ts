import type { Lang } from '@/i18n';

/** 主图与辅助内容流程图的本地化标签 */
export type InspectCompileFlowI18n = Readonly<{
  input: string;
  compile: string;
  primary: string;
  observation: string;
  inspect: string;
  fragment: string;
  render: string;
}>;

/** 按文档语言获取流程图标签 */
export const inspectCompileFlowI18n: Record<Lang, InspectCompileFlowI18n> = {
  zh: {
    input: '用户描述主图',
    compile: 'Core 确定绘图结果',
    primary: '主图结果保持不变',
    observation: 'Core 通知选中对象的结果',
    inspect: 'Inspect 生成辅助绘图描述',
    fragment: 'Core 单独编译辅助内容',
    render: 'Render 显示主图与辅助层',
  },
  en: {
    input: 'User describes figure',
    compile: 'Core compiles figure',
    primary: 'Primary unchanged',
    observation: 'Core reports results',
    inspect: 'Inspect creates marks',
    fragment: 'Core compiles marks',
    render: 'Render displays both',
  },
};
