import type { RefObject } from 'react';

import { useEffect, useRef, useState } from 'react';

import type { PreviewPanelControlsDefinition } from '../../types';
import type { PreviewControlColumnSection, PreviewControlLayoutMetrics } from '../utils';

import { indexPreviewControlSections, layoutPreviewControlSections } from '../utils';

const TWO_COLUMN_MIN_WIDTH = 300;
const ITEM_GAP = 8;
const SECTION_GAP = 12;
const TITLE_FALLBACK_HEIGHT = 24;
const COMPACT_FIELD_FALLBACK_HEIGHT = 28;
const DEFAULT_FIELD_FALLBACK_HEIGHT = 36;

type PreviewControlLayoutState = {
  definition: PreviewPanelControlsDefinition;
  columns: Array<Array<PreviewControlColumnSection>>;
  signature: string;
};

/** 高度感知控制面板布局参数 */
export type UsePreviewControlLayoutOptions = {
  definition: PreviewPanelControlsDefinition;
  collapsedSectionIndexes: ReadonlySet<number>;
  density: 'compact' | 'default';
  panelRef: RefObject<HTMLElement>;
};

/** 高度感知控制面板布局结果 */
export type PreviewControlLayout = {
  columns: Array<Array<PreviewControlColumnSection>>;
  columnsRef: RefObject<HTMLDivElement>;
};

const getLayoutSignature = (columns: ReadonlyArray<ReadonlyArray<PreviewControlColumnSection>>): string =>
  columns
    .map(column =>
      column
        .map(
          section =>
            `${section.sourceIndex}:${section.showTitle ? 'title' : 'continuation'}:${section.controls.map(field => field.id).join(',')}`,
        )
        .join('|'),
    )
    .join('||');

/** 监听控制面板真实尺寸并在一列与最多两列之间自动回流 */
export const usePreviewControlLayout = (options: UsePreviewControlLayoutOptions): PreviewControlLayout => {
  const { definition, collapsedSectionIndexes, density, panelRef } = options;
  const columnsRef = useRef<HTMLDivElement>(null);
  const indexedSections = indexPreviewControlSections(definition.sections);
  const singleColumn = [indexedSections];
  const [layoutState, setLayoutState] = useState<PreviewControlLayoutState>(() => ({
    definition,
    columns: singleColumn,
    signature: getLayoutSignature(singleColumn),
  }));
  const panelWidthRef = useRef(0);
  const availableHeightRef = useRef(0);
  const measurementCacheRef = useRef({
    definition,
    titleHeights: new Map<number, number>(),
    fieldHeights: new Map<string, number>(),
  });
  const columns = layoutState.definition === definition ? layoutState.columns : singleColumn;
  const renderedLayoutSignature = getLayoutSignature(columns);
  const collapsedSignature = Array.from(collapsedSectionIndexes)
    .sort((left, right) => left - right)
    .join(',');

  useEffect(() => {
    const panel = panelRef.current;
    const columnsElement = columnsRef.current;
    if (!panel || !columnsElement) return undefined;
    if (typeof ResizeObserver === 'undefined') return undefined;

    if (measurementCacheRef.current.definition !== definition) {
      measurementCacheRef.current = {
        definition,
        titleHeights: new Map(),
        fieldHeights: new Map(),
      };
    }

    let animationFrame = 0;
    const measure = () => {
      const cache = measurementCacheRef.current;
      columnsElement.querySelectorAll<HTMLElement>('[data-section-index]').forEach(element => {
        const sourceIndex = Number(element.dataset.sectionIndex);
        const height = element.getBoundingClientRect().height;
        if (Number.isInteger(sourceIndex) && height > 0) cache.titleHeights.set(sourceIndex, height);
      });
      columnsElement.querySelectorAll<HTMLElement>('[data-control-id]').forEach(element => {
        const fieldId = element.dataset.controlId;
        const height = element.getBoundingClientRect().height;
        if (fieldId && height > 0) cache.fieldHeights.set(fieldId, height);
      });

      const panelWidth = panelWidthRef.current || panel.getBoundingClientRect().width;
      const availableHeight = availableHeightRef.current || columnsElement.getBoundingClientRect().height;
      const metrics: PreviewControlLayoutMetrics = {
        availableHeight,
        titleHeights: cache.titleHeights,
        fieldHeights: cache.fieldHeights,
        fallbackTitleHeight: TITLE_FALLBACK_HEIGHT,
        fallbackFieldHeight: density === 'compact' ? COMPACT_FIELD_FALLBACK_HEIGHT : DEFAULT_FIELD_FALLBACK_HEIGHT,
        itemGap: ITEM_GAP,
        sectionGap: SECTION_GAP,
      };
      const nextColumns = layoutPreviewControlSections(
        definition.sections,
        collapsedSectionIndexes,
        metrics,
        panelWidth >= TWO_COLUMN_MIN_WIDTH ? 2 : 1,
      );
      const nextSignature = getLayoutSignature(nextColumns);

      setLayoutState(currentState => {
        if (currentState.definition === definition && currentState.signature === nextSignature) return currentState;
        return { definition, columns: nextColumns, signature: nextSignature };
      });
    };
    const scheduleMeasure = () => {
      cancelAnimationFrame(animationFrame);
      animationFrame = requestAnimationFrame(measure);
    };
    const observer = new ResizeObserver(entries => {
      entries.forEach(entry => {
        if (entry.target === panel) panelWidthRef.current = entry.contentRect.width;
        if (entry.target === columnsElement) availableHeightRef.current = entry.contentRect.height;
      });
      scheduleMeasure();
    });

    observer.observe(panel);
    observer.observe(columnsElement);
    columnsElement
      .querySelectorAll<HTMLElement>('[data-section-index], [data-control-id]')
      .forEach(element => observer.observe(element));
    scheduleMeasure();

    return () => {
      cancelAnimationFrame(animationFrame);
      observer.disconnect();
    };
  }, [collapsedSignature, definition, density, panelRef, renderedLayoutSignature]);

  return { columns, columnsRef };
};
