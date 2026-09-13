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
    input: '主图、registry 与 selection',
    compile: '选择准入与 Core 编译',
    primary: '主图结果保持不变',
    observation: '收集最终产物',
    inspect: '匹配实例并生成辅助描述',
    fragment: 'Core 单独编译辅助内容',
    render: 'Render 显示主图与辅助层',
  },
  en: {
    input: 'Figure, registry, selection',
    compile: 'Admit selection; Core compiles',
    primary: 'Primary unchanged',
    observation: 'Capture final outputs',
    inspect: 'Match instances; create marks',
    fragment: 'Core compiles marks',
    render: 'Render displays both',
  },
};
