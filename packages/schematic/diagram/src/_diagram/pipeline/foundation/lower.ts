import type { IRChild, IRNode, IRScope, IRTextBlock } from '@retikz/core';
import type { IRFlexLayoutItem } from '@retikz/layout';
import type { IRSurface } from '@retikz/standard';

import { Side } from '@retikz/core';
import { createFlexLayout, FlexLayoutDirection, LayoutAlignment } from '@retikz/layout';
import { createSurface } from '@retikz/standard';

import type { DiagramFoundationResolution } from '../../resolve';
import type { EffectiveDiagramTextAppearance } from '../../resolve/theme';

const flexItem = (key: string, child: IRChild, alignSelf?: IRFlexLayoutItem['alignSelf']): IRFlexLayoutItem => ({
  kind: 'flex',
  key,
  child,
  margin: 0,
  basis: 'content',
  grow: 0,
  shrink: 1,
  ...(alignSelf === undefined ? {} : { alignSelf }),
});

/** 创建不带可见 Node 外壳的 presentation text */
export const createDiagramPresentationTextNode = (
  text: IRTextBlock,
  appearance: EffectiveDiagramTextAppearance,
): IRNode => ({
  type: 'node',
  position: [0, 0],
  shape: 'rectangle',
  fill: 'none',
  stroke: 'none',
  strokeWidth: 0,
  padding: 0,
  margin: 0,
  minimumSize: 0,
  scale: 1,
  rotate: 0,
  text,
  ...appearance,
});

/** 创建只切断外层 Node 默认的 heading 内容 */
const headingContent = (resolution: DiagramFoundationResolution): IRScope | undefined => {
  const title = resolution.presentation?.title;
  const description = resolution.presentation?.description;

  let child: IRChild;
  if (title === undefined) {
    if (description === undefined) return undefined;
    child = createDiagramPresentationTextNode(description, resolution.presentationAppearance.description);
  } else if (description === undefined) {
    child = createDiagramPresentationTextNode(title, resolution.presentationAppearance.title);
  } else {
    const titleNode = createDiagramPresentationTextNode(title, resolution.presentationAppearance.title);
    const descriptionNode = createDiagramPresentationTextNode(
      description,
      resolution.presentationAppearance.description,
    );
    child = createFlexLayout({
      direction: FlexLayoutDirection.Column,
      gap: resolution.frame.titleDescriptionGap,
      alignItems: LayoutAlignment.Stretch,
      children: [flexItem('title', titleNode), flexItem('description', descriptionNode)],
    });
  }

  return { type: 'scope', resetStyle: ['node'], children: [child] };
};

/** 创建 drawing 与可选 Legend 的固定 main 区域 */
const mainContent = (resolution: DiagramFoundationResolution, drawingChild: IRChild): IRChild => {
  const legend = resolution.presentation?.legend;
  if (legend === undefined) return drawingChild;

  const side = resolution.frame.legendPosition;
  const direction = side === Side.Top || side === Side.Bottom ? FlexLayoutDirection.Column : FlexLayoutDirection.Row;
  const legendItem = flexItem('legend', legend, resolution.frame.legendAlign);
  const drawingItem = flexItem('drawing', drawingChild, LayoutAlignment.Stretch);
  const legendFirst = side === Side.Top || side === Side.Left;

  return createFlexLayout({
    direction,
    gap: resolution.frame.drawingLegendGap,
    alignItems: LayoutAlignment.Stretch,
    children: legendFirst ? [legendItem, drawingItem] : [drawingItem, legendItem],
  });
};

/** 把 Diagram Foundation resolution 与不透明 drawing child 下沉为 Standard Surface */
export const lowerDiagramFoundation = (resolution: DiagramFoundationResolution, drawingChild: IRChild): IRSurface => {
  const heading = headingContent(resolution);
  const main = mainContent(resolution, drawingChild);
  const child =
    heading === undefined
      ? main
      : createFlexLayout({
          direction: FlexLayoutDirection.Column,
          gap: resolution.frame.headingMainGap,
          alignItems: LayoutAlignment.Stretch,
          children: [flexItem('heading', heading), flexItem('main', main)],
        });

  return createSurface({
    namespace: 'standard',
    type: 'surface',
    child,
    padding: resolution.frame.padding,
    overflow: resolution.frame.overflow,
    cornerRadius: resolution.frame.cornerRadius,
    ...(resolution.frame.background === undefined ? {} : { background: resolution.frame.background }),
    ...(resolution.frame.border === undefined ? {} : { border: resolution.frame.border }),
  });
};
