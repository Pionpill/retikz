import { useParams } from 'react-router';

/**
 * 当前文档页的归一化位置参数
 * @description 兼容 grouped (`/<module>/<section>/<page>(/<sub>)?`) 与 ungrouped (`/<module>/<page>`)；ungrouped 时 sectionId 为 null
 */
export type DocLocation = {
  moduleId: string;
  /** 分组 id；命中无分组（unlabeled section）的页时为 null */
  sectionId: string | null;
  pageId: string;
  subPageId?: string;
};

/**
 * 读 useParams 并归一两种路由形态
 * @description grouped 走 `:moduleId/:sectionId/:pageId(/:subPageId)?`；ungrouped 走 `:moduleId/:firstSeg`（由 TwoSegResolver 验证）；无效参数返回 null
 */
export const useDocLocation = (): DocLocation | null => {
  const { moduleId, sectionId, pageId, subPageId, firstSeg } = useParams<
    'moduleId' | 'sectionId' | 'pageId' | 'subPageId' | 'firstSeg'
  >();
  if (!moduleId) return null;
  if (firstSeg) return { moduleId, sectionId: null, pageId: firstSeg };
  if (sectionId && pageId) return { moduleId, sectionId, pageId, subPageId };
  return null;
};

/** location → URL/文件路径所需的 segment 数组（无分组时跳过 sectionId 段） */
export const docPathSegments = (loc: DocLocation): Array<string> => {
  const parts = [loc.moduleId];
  if (loc.sectionId) parts.push(loc.sectionId);
  parts.push(loc.pageId);
  if (loc.subPageId) parts.push(loc.subPageId);
  return parts;
};
