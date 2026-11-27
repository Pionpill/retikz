/** 展示几何、资源与警告各自在编译中的去向的双语标签 */
export const workspaceOutputsI18n = {
  zh: {
    boundary: '连接边界',
    point: '连线求端点时复用',
    resources: '图元引用的资源',
    scene: '交给渲染器',
    warnings: '本次计算的警告',
    snapshot: '随快照发布',
  },
  en: {
    boundary: 'Connection boundary',
    point: 'Reuse for path endpoints',
    resources: 'Referenced resources',
    scene: 'Pass to renderer',
    warnings: 'Warnings from this run',
    snapshot: 'Publish with snapshot',
  },
} as const;
