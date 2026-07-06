import type { I18nKey } from '@/modules/docs/data';

/** 当前文档页的归一化位置参数。 */
export type DocLocation = {
  moduleId: string;
  /** 分组 id；无分组页面时为 null。 */
  sectionId: string | null;
  /** 路由 :pageId 段；分组文档页没有该段，因此为 null。 */
  pageId: string | null;
  subPageId?: string;
};

/** 文档树中的可导航叶子页。 */
export type LeafNode = {
  /** 路由 :sectionId 段；ungrouped 时为 null。 */
  sectionId: string | null;
  /** 路由 :pageId 段；分组文档页为 null。 */
  pageId: string | null;
  /** 路由 :subPageId 段。 */
  subPageId?: string;
  /** 节点 i18n label key。 */
  label: I18nKey;
  /** 完整路径，含 moduleId 前缀；无分组时不出现 sectionId 段。 */
  path: string;
};
