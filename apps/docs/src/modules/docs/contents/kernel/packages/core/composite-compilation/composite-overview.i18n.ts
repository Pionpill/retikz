import type { Lang } from '@/i18n';

/** 复合编译流程文案 */
export const compositeOverviewI18n: Record<Lang, { stages: Array<string>; compileGroup: string }> = {
  zh: {
    compileGroup: '按需试算与放置',
    stages: [
      '绑定复合定义\n校验父项输入',
      '试算子布局\n保留候选结果',
      '选择并放置\n返回输出子项',
      '提交到 Scene\n图元、引用与资源',
    ],
  },
  en: {
    compileGroup: 'Optional layout',
    stages: [
      'Bind Definition\nValidate parent input',
      'Probe children\nRetain candidates',
      'Select and place\nReturn output children',
      'Commit to Scene\nPrimitives, references, resources',
    ],
  },
};
