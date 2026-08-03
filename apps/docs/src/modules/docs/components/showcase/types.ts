import type { I18nKey, ShowcaseMetadata } from '@/modules/docs/data';

/** 自动发现的一篇 Showcase 页面 */
export type ShowcasePageEntry = {
  /** 可导航的站内路径 */
  path: string;
  /** ComponentPreview registry 使用的内容目录片段 */
  segments: Array<string>;
  /** 页面标题的完整 i18n key */
  label: I18nKey;
  /** 页面声明的 Showcase 关系 */
  metadata: ShowcaseMetadata;
};
