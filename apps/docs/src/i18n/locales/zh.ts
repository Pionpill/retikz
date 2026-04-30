/** 中文文案。结构同 en.ts；新增 key 时两边同步。 */
export const zh = {
  common: {
    search: '搜索本栏目...',
    pageCount: '{{count}} 页',
    notFound: '页面不存在：/{{section}}/{{page}}',
    versionTag: 'v0.1 alpha',
    contentPlaceholder: '{{title}} —— v0.1 alpha 内容补充中。',
    github: 'GitHub',
    githubRepo: 'Pionpill/retikz',
    switchLanguage: '切换语言',
    themeLight: '浅色主题',
    themeDark: '深色主题',
    brandTagline: 'TikZ 风格的 React 绘图库',
  },
  sections: {
    core: '核心',
    plot: '图表',
    flow: '流程',
  },
  pages: {
    'core-intro': '介绍 & 安装',
    'plot-intro': '介绍（v0.2）',
    'flow-intro': '介绍（v0.3+）',
  },
};

/** 资源结构由 zh 推导（不带 as const，值收敛成 string，让 en 等其它语言能赋值） */
export type Resources = typeof zh;
