/** Table 内置视觉样式 */
export const TableStyle = {
  /** 中性默认样式 */
  Neutral: 'neutral',
  /** 出版物式样式 */
  Academic: 'academic',
  /** 高区分度数据画布样式 */
  Vibrant: 'vibrant',
  /** 无装饰兼容样式 */
  Clean: 'clean',
} as const;

/** Table 显式主题模式 */
export const TableThemeMode = {
  /** 浅色 token map */
  Light: 'light',
  /** 深色 token map */
  Dark: 'dark',
} as const;
