import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import type { Page } from './interface';
import { modules } from './module';
import { getSectionsByModule } from './sections';

/** 文档页面的扁平索引项；DocsSearch 与 AI Chat 的 Add Context 共用 */
export type DocPageEntry = {
  /** 路由路径，点击 onSelect 时跳转 */
  path: string;
  /** 翻译后的页面标题 */
  label: string;
  /** 翻译后的模块名（用于分组 heading） */
  moduleLabel: string;
  /** 翻译后的栏目名（顶部 section 名，可空——ungrouped section） */
  sectionLabel?: string;
  /** 翻译后的父级页面名（仅 4 段子页有） */
  parentLabel?: string;
};

/**
 * 把 data/ 里的 module → section → page 树扁平为 DocPageEntry 列表
 * @description i18n 切换语言时 label 自动重算；DocsSearch 与 AI Chat 的 Add Context 都按 label 模糊匹配
 */
export const useDocPageEntries = (): Array<DocPageEntry> => {
  const { t, i18n } = useTranslation();
  return useMemo(() => {
    const out: Array<DocPageEntry> = [];
    for (const m of modules) {
      const moduleLabel = String(t(m.label));
      const sections = getSectionsByModule(m.id);
      for (const section of sections) {
        const ungrouped = !section.id || !section.label;
        const sectionLabel = section.label ? String(t(section.label)) : undefined;
        const walk = (pages: Array<Page>, parent: { id: string; label: string } | null) => {
          for (const page of pages) {
            const pageLabel = String(t(page.label));
            if (page.children) {
              walk(page.children, { id: page.id, label: pageLabel });
              continue;
            }
            const path = ungrouped
              ? `/${m.id}/${page.id}`
              : parent
                ? `/${m.id}/${section.id}/${parent.id}/${page.id}`
                : `/${m.id}/${section.id}/${page.id}`;
            out.push({
              path,
              label: pageLabel,
              moduleLabel,
              sectionLabel,
              parentLabel: parent?.label,
            });
          }
        };
        walk(section.pages, null);
      }
    }
    return out;
  }, [t, i18n.resolvedLanguage]);
};
