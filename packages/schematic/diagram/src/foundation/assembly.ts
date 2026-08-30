import type { IRChild, IRNode, IRTextBlock } from '@retikz/core';
import type { IRFlexLayoutItem } from '@retikz/layout';

import { createFlexLayout, FlexLayoutDirection, LayoutAlignment } from '@retikz/layout';
import { createSurface } from '@retikz/standard';

import type { DiagramAssemblyInput, ResolvedDiagramTextAppearance } from './types';

import { DiagramFrameSchema, DiagramPresentationSchema } from './schema';
import { resolveDiagramFrame } from './theme';

const flexItem = (key: string, child: IRChild, alignSelf?: 'start' | 'center' | 'end'): IRFlexLayoutItem => ({
  kind: 'flex',
  key,
  child,
  margin: 0,
  basis: 'content',
  grow: 0,
  shrink: 1,
  ...(alignSelf === undefined ? {} : { alignSelf }),
});

const textNode = (text: IRTextBlock, appearance: ResolvedDiagramTextAppearance): IRChild => {
  const node: IRNode = {
    type: 'node',
    position: [0, 0],
    shape: 'rectangle',
    fill: 'none',
    stroke: 'none',
    textColor: appearance.textColor,
    opacity: appearance.opacity,
    padding: 0,
    margin: 0,
    text,
    font: appearance.font,
    align: appearance.align,
    lineHeight: appearance.lineHeight,
    ...(appearance.maxTextWidth === undefined ? {} : { maxTextWidth: appearance.maxTextWidth }),
  };
  return { type: 'scope', resetStyle: ['node'], children: [node] };
};

const headingOf = (
  presentation: DiagramAssemblyInput['presentation'],
  appearance: DiagramAssemblyInput['appearance'],
  gap: number,
): IRChild | undefined => {
  const children: Array<IRFlexLayoutItem> = [];
  if (presentation.title !== undefined)
    children.push(flexItem('title', textNode(presentation.title, appearance.title)));
  if (presentation.description !== undefined) {
    children.push(flexItem('description', textNode(presentation.description, appearance.description)));
  }
  if (children.length === 0) return undefined;
  if (children.length === 1) {
    return children[0].child;
  }
  return createFlexLayout({
    direction: FlexLayoutDirection.Column,
    gap,
    alignItems: LayoutAlignment.Stretch,
    children,
  });
};

const mainOf = (
  drawing: IRChild,
  legend: NonNullable<DiagramAssemblyInput['presentation']['legend']>,
  position: 'top' | 'right' | 'bottom' | 'left',
  align: 'start' | 'center' | 'end',
  gap: number,
): IRChild => {
  const legendItem = flexItem('legend', legend, align);
  const drawingItem = flexItem('drawing', drawing);
  const children = position === 'top' || position === 'left' ? [legendItem, drawingItem] : [drawingItem, legendItem];
  return createFlexLayout({
    direction: position === 'top' || position === 'bottom' ? FlexLayoutDirection.Column : FlexLayoutDirection.Row,
    gap,
    alignItems: LayoutAlignment.Stretch,
    children,
  });
};

/** 将 Presentation 与不透明 drawing child 组装为一个 Standard Surface child */
export const assembleDiagram = (input: DiagramAssemblyInput): IRChild => {
  const presentation = DiagramPresentationSchema.parse(input.presentation);
  const frame = resolveDiagramFrame(presentation, input.frame, input.appearance);
  const heading = headingOf(presentation, input.appearance, frame.titleDescriptionGap);
  const main =
    presentation.legend === undefined
      ? input.drawing
      : mainOf(input.drawing, presentation.legend, frame.legendPosition, frame.legendAlign, frame.drawingLegendGap);
  const content =
    heading === undefined
      ? main
      : createFlexLayout({
          direction: FlexLayoutDirection.Column,
          gap: frame.headingMainGap,
          alignItems: LayoutAlignment.Stretch,
          children: [flexItem('heading', heading), flexItem('main', main)],
        });

  return createSurface({
    namespace: 'standard',
    type: 'surface',
    child: content,
    padding: frame.padding,
    overflow: frame.overflow,
    cornerRadius: frame.cornerRadius,
    ...(frame.background === undefined ? {} : { background: frame.background }),
    ...(frame.border === undefined ? {} : { border: frame.border }),
  });
};

export { DiagramFrameSchema, DiagramPresentationSchema };
