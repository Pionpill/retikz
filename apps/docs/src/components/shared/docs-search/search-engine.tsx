import { type ReactNode, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import type { Page } from '@/data/interface';
import { modules } from '@/data/module';
import { getSectionsByModule } from '@/data/sections';
import type { Lang } from '@/i18n';

import { type IndexedPage, type SearchIndex } from './search-index';

/** 可被匹配的字段类型；优先级 label > description > heading > code */
export type FieldKind = 'label' | 'description' | 'heading' | 'code';

export type Field = {
  kind: FieldKind;
  /** 用于结果列表显示（保留原始大小写） */
  original: string;
  /** 用于匹配（已 toLowerCase） */
  lower: string;
};

export type SearchEntry = {
  path: string;
  label: string;
  moduleLabel: string;
  sectionLabel?: string;
  parentLabel?: string;
  /** label + 当前语言下从 mdx 抽取的可搜索字段，按匹配优先级排好 */
  fields: ReadonlyArray<Field>;
};

export type Match = {
  score: number;
  kind: FieldKind;
  /** 命中的原始字段文本（保留大小写） */
  text: string;
  /** 子串命中在 lower-cased text 中的位置；fuzzy 命中为 -1 */
  index: number;
  queryLength: number;
};

const FIELD_WEIGHT: Record<FieldKind, number> = {
  label: 1000,
  description: 100,
  heading: 50,
  code: 30,
};

/** 结果列表 snippet 行最多展示这么多字符；超出在匹配位置开窗 + 前后省略号 */
const SNIPPET_LENGTH = 80;

const buildFields = (pageLabel: string, indexed: IndexedPage | undefined): ReadonlyArray<Field> => {
  const fields: Array<Field> = [{ kind: 'label', original: pageLabel, lower: pageLabel.toLowerCase() }];
  if (!indexed) return fields;
  if (indexed.description) {
    fields.push({
      kind: 'description',
      original: indexed.description,
      lower: indexed.description.toLowerCase(),
    });
  }
  for (const heading of indexed.headings) {
    fields.push({ kind: 'heading', original: heading, lower: heading.toLowerCase() });
  }
  for (const inlineCode of indexed.inlineCodes) {
    fields.push({ kind: 'code', original: inlineCode, lower: inlineCode.toLowerCase() });
  }
  return fields;
};

/**
 * 把 data/ 里的 module → section → page 树扁平为 SearchEntry 列表
 * @description i18n 切换语言时 label 自动重算；searchIndex 异步加载完后 fields 自动扩展（label 字段无依赖，body 字段按 lang 取索引）
 */
export const useSearchEntries = (searchIndex: SearchIndex, lang: Lang): Array<SearchEntry> => {
  const { t } = useTranslation();
  return useMemo(() => {
    const out: Array<SearchEntry> = [];
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
            const indexed = searchIndex[path]?.[lang];
            out.push({
              path,
              label: pageLabel,
              moduleLabel,
              sectionLabel,
              parentLabel: parent?.label,
              fields: buildFields(pageLabel, indexed),
            });
          }
        };
        walk(section.pages, null);
      }
    }
    return out;
  }, [searchIndex, lang, t]);
};

/**
 * 字段评分 + 命中记录
 * @description 按 entry.fields 顺序（label → description → heading → code）首次命中即返回——保证 label 命中永远优先于 body 命中。基础分：前缀 3 / 子串 2 / 字符跳跃 1，乘以字段权重得出最终 score 用于排序
 */
export const findMatch = (query: string, entry: SearchEntry): Match | null => {
  const q = query.trim().toLowerCase();
  // < 2 字符视同空 query：全量展示按数据顺序的列表，不进入字段匹配——避免单字符触发大量低相关性命中
  if (q.length < 2) {
    return { score: 1, kind: 'label', text: entry.label, index: -1, queryLength: 0 };
  }
  for (const field of entry.fields) {
    const idx = field.lower.indexOf(q);
    let base = 0;
    if (idx === 0) base = 3;
    else if (idx > 0) base = 2;
    else {
      let qi = 0;
      for (let i = 0; i < field.lower.length && qi < q.length; i++) {
        if (field.lower[i] === q[qi]) qi++;
      }
      if (qi === q.length) base = 1;
    }
    if (base > 0) {
      return {
        score: base * FIELD_WEIGHT[field.kind],
        kind: field.kind,
        text: field.original,
        index: idx,
        queryLength: q.length,
      };
    }
  }
  return null;
};

const HIGHLIGHT_CLASS = 'rounded-sm bg-amber-200/70 px-0.5 text-foreground dark:bg-amber-500/30';

/** 在原始文本里把 [index, index+length) 的子串用 mark 包起来；index<0 或 length=0 直接原样返回 */
export const renderHighlighted = (text: string, index: number, length: number): ReactNode => {
  if (index < 0 || length === 0) return text;
  return (
    <>
      {text.slice(0, index)}
      <mark className={HIGHLIGHT_CLASS}>{text.slice(index, index + length)}</mark>
      {text.slice(index + length)}
    </>
  );
};

/**
 * 结果项底部 snippet：在匹配位置周围开窗、首尾按需补 `…`
 * @description 子串命中时围绕 index 取 SNIPPET_LENGTH 窗；fuzzy 命中无单点位置，退化为前 80 字符 + 省略号
 */
export const renderSnippet = (text: string, index: number, length: number): ReactNode => {
  if (index < 0 || length === 0) {
    return text.length > SNIPPET_LENGTH ? `${text.slice(0, SNIPPET_LENGTH)}…` : text;
  }
  if (text.length <= SNIPPET_LENGTH) {
    return renderHighlighted(text, index, length);
  }
  const halfRoom = Math.floor((SNIPPET_LENGTH - length) / 2);
  let start = Math.max(0, index - halfRoom);
  const end = Math.min(text.length, start + SNIPPET_LENGTH);
  if (end - start < SNIPPET_LENGTH) start = Math.max(0, end - SNIPPET_LENGTH);
  const windowed = text.slice(start, end);
  const localIndex = index - start;
  return (
    <>
      {start > 0 && '…'}
      {renderHighlighted(windowed, localIndex, length)}
      {end < text.length && '…'}
    </>
  );
};
