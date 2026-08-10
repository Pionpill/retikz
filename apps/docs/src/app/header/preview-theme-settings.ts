/** 判断当前文档是否提供全局主题风格设置 */
export const isPreviewThemeStyleDocument = (
  moduleId: string | undefined,
  sectionId: string | null | undefined,
): boolean => moduleId === 'viz' && (sectionId === 'table' || sectionId === 'chart' || sectionId === 'plot');
