/** 作用域遍历流程的双语标签 */
export const scopeVisitI18n = {
  zh: ['准备子执行帧', '遍历本层子项', '确定作用域布局', '补齐几何变换', '回填本层路径', '退出后发布给父层'],
  en: [
    'Prepare child frame',
    'Visit children',
    'Compute scope layout',
    'Project geometry',
    'Fill pending paths',
    'Leave and publish to parent',
  ],
} as const;
