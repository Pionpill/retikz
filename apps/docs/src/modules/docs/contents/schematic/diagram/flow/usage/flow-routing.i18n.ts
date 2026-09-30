/** Flow 路由比较图与面板文案 */
export const flowRoutingI18n = {
  zh: {
    title: '连线路由',
    section: '路径形状',
    kind: '路由模式',
    radius: '转角半径',
    kindOptions: [
      { value: 'straight', label: '直线' },
      { value: 'orthogonal', label: '正交折线' },
      { value: '-|', label: '先水平后垂直' },
      { value: '|-', label: '先垂直后水平' },
    ],
  },
  en: {
    title: 'Connection routing',
    section: 'Path shape',
    kind: 'Routing mode',
    radius: 'Corner radius',
    kindOptions: [
      { value: 'straight', label: 'Straight' },
      { value: 'orthogonal', label: 'Orthogonal' },
      { value: '-|', label: 'Horizontal then vertical' },
      { value: '|-', label: 'Vertical then horizontal' },
    ],
  },
} as const;
