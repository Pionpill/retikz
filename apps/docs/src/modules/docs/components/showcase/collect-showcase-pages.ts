import type { Section, SubPage } from '@/modules/docs/data';

import type { ShowcasePageEntry } from './types';

/** 校验 Showcase metadata 的运行时不变量 */
const assertShowcaseMetadata = (entry: ShowcasePageEntry): void => {
  const { metadata, path } = entry;
  if (metadata.family.trim().length === 0) throw new Error(`Showcase page "${path}" requires a family`);
  if (metadata.preview.trim().length === 0) throw new Error(`Showcase page "${path}" requires a preview`);
  if (!Number.isInteger(metadata.order)) throw new Error(`Showcase page "${path}" requires an integer order`);
};

/** 收集全部显式 Showcase 页面，并校验 Family 顺序冲突 */
export const collectShowcasePages = (moduleId: string, sections: Array<Section>): Array<ShowcasePageEntry> => {
  const entries: Array<ShowcasePageEntry> = [];

  const visit = (node: SubPage, segments: Array<string>): void => {
    const path = `/${segments.join('/')}`;
    const layout = node.meta?.layout;
    const metadata = node.meta?.showcase;

    if (layout === 'showcase' && metadata === undefined) {
      throw new Error(`Showcase page "${path}" requires showcase metadata`);
    }
    if (layout !== 'showcase' && metadata !== undefined) {
      throw new Error(`Showcase metadata on "${path}" requires layout "showcase"`);
    }
    if (layout === 'showcase' && metadata !== undefined) {
      const entry = { path, segments, label: node.label, metadata };
      assertShowcaseMetadata(entry);
      entries.push(entry);
    }

    for (const child of node.children ?? []) visit(child, [...segments, child.id]);
  };

  for (const section of sections) {
    const sectionSegments = section.label && section.id ? [moduleId, section.id] : [moduleId];
    for (const page of section.pages) visit(page, [...sectionSegments, page.id]);
  }

  const familyOrders = new Map<string, Map<number, string>>();
  for (const entry of entries) {
    const orders = familyOrders.get(entry.metadata.family) ?? new Map<number, string>();
    const previousPath = orders.get(entry.metadata.order);
    if (previousPath !== undefined) {
      throw new Error(
        `Duplicate Showcase order ${entry.metadata.order} in family "${entry.metadata.family}": "${previousPath}" and "${entry.path}"`,
      );
    }
    orders.set(entry.metadata.order, entry.path);
    familyOrders.set(entry.metadata.family, orders);
  }

  return entries.sort(
    (left, right) =>
      left.metadata.family.localeCompare(right.metadata.family) ||
      left.metadata.order - right.metadata.order ||
      left.path.localeCompare(right.path),
  );
};
