import type { IRJsonObject, IRNode, IRScope, IRTextBlock } from '@retikz/core';

import { GeometryLabelPosition } from '@retikz/core';

import type { PlotLabel, PlotLayout } from '../schemas';
import type { Margins, Rect } from './layout';

import { AxisCardinalSide } from '../schemas';
import { PlotLayerZIndex } from '../schemas/layer';
import {
  LayoutAnchor,
  LayoutPlacementKind,
  LayoutPlacementTarget,
  PlotLabelRole,
  PlotLayoutMode,
} from '../schemas/layout';
import { estimateLabelWidth } from './layout';

type TextLabel = Extract<PlotLabel, { type: 'text' }>;
type TextStyle = Partial<Pick<IRNode, 'align' | 'font' | 'lineHeight' | 'maxTextWidth' | 'opacity' | 'rotate' | 'textColor'>>;

type ResolvedTextLabel = {
  label: TextLabel;
  placement: NonNullable<TextLabel['placement']>;
  padding: number;
  fontSize: number;
  textStyle: TextStyle;
  bounds: { width: number; height: number };
};

type LabelLayoutInput = {
  layout?: PlotLayout;
  labels: ReadonlyArray<PlotLabel>;
  fontSize: number;
  textStyle: TextStyle;
};

type LowerLabelsInput = LabelLayoutInput & {
  width: number;
  height: number;
  plotArea: Rect;
};

const EMPTY_RESERVE: Partial<Margins> = {};

const textFontSizeOf = (label: TextLabel, themeTextStyle: TextStyle, fallback: number): number =>
  label.font?.size ?? themeTextStyle.font?.size ?? fallback;

const mergeTextStyle = (themeTextStyle: TextStyle, label: TextLabel): TextStyle => ({
  ...themeTextStyle,
  ...label,
  ...(themeTextStyle.font !== undefined || label.font !== undefined
    ? { font: { ...(themeTextStyle.font ?? {}), ...(label.font ?? {}) } }
    : {}),
});

const textBlockLines = (text: IRTextBlock): Array<string> => {
  if (typeof text === 'string') return text.split('\n');
  return text.map(line => {
    if (typeof line === 'string') return line;
    if ('text' in line) return line.text;
    return line.runs.map(run => ('text' in run ? run.text : run.tex)).join('');
  });
};

const textBoundsOf = (text: IRTextBlock, fontSize: number, maxTextWidth: number | undefined): { width: number; height: number } => {
  const lines = textBlockLines(text);
  const lineHeight = fontSize * 1.2;
  const rawWidth = lines.length === 0 ? 0 : Math.max(...lines.map(line => estimateLabelWidth(line, fontSize)));
  return {
    width: maxTextWidth === undefined ? rawWidth : Math.min(rawWidth, maxTextWidth),
    height: Math.max(1, lines.length) * lineHeight,
  };
};

const defaultPlacementOf = (label: TextLabel): NonNullable<TextLabel['placement']> => {
  if (label.role === PlotLabelRole.Caption) {
    return { kind: LayoutPlacementKind.Side, side: AxisCardinalSide.Bottom, placement: GeometryLabelPosition.AtStart };
  }
  if (label.role === PlotLabelRole.Source) {
    return { kind: LayoutPlacementKind.Side, side: AxisCardinalSide.Bottom, placement: GeometryLabelPosition.AtEnd };
  }
  if (label.role === PlotLabelRole.Note) {
    return { kind: LayoutPlacementKind.Side, side: AxisCardinalSide.Top, placement: GeometryLabelPosition.AtEnd };
  }
  return { kind: LayoutPlacementKind.Side, side: AxisCardinalSide.Top, placement: GeometryLabelPosition.Midway };
};

const defaultReserveOf = (label: TextLabel): boolean =>
  label.role === PlotLabelRole.Title || label.role === PlotLabelRole.Caption || label.role === PlotLabelRole.Source;

const placementRatioOf = (placement: NonNullable<TextLabel['placement']>): number => {
  if (placement.kind !== LayoutPlacementKind.Side) return 0.5;
  const value = placement.placement ?? GeometryLabelPosition.Midway;
  if (typeof value === 'number') return value;
  if (value === GeometryLabelPosition.AtStart) return 0;
  if (value === GeometryLabelPosition.VeryNearStart) return 0.125;
  if (value === GeometryLabelPosition.NearStart) return 0.25;
  if (value === GeometryLabelPosition.NearEnd) return 0.75;
  if (value === GeometryLabelPosition.VeryNearEnd) return 0.875;
  if (value === GeometryLabelPosition.AtEnd) return 1;
  return 0.5;
};

const defaultPaddingOf = (label: TextLabel): number => {
  if (label.role === PlotLabelRole.Note || label.role === PlotLabelRole.Custom) return 6;
  return 8;
};

const resolveLabels = (input: LabelLayoutInput): Array<ResolvedTextLabel> =>
  input.labels.map(label => {
    const textLabel = label;
    const textStyle = mergeTextStyle(input.textStyle, textLabel);
    const fontSize = textFontSizeOf(textLabel, input.textStyle, input.fontSize);
    const placement = textLabel.placement ?? defaultPlacementOf(textLabel);
    const padding = placement.kind === LayoutPlacementKind.Side ? (placement.padding ?? defaultPaddingOf(textLabel)) : 0;
    return {
      label: textLabel,
      placement,
      padding,
      fontSize,
      textStyle,
      bounds: textBoundsOf(textLabel.text, fontSize, textStyle.maxTextWidth),
    };
  });

const reserveEnabled = (layout: PlotLayout | undefined): boolean =>
  layout?.mode !== PlotLayoutMode.Fixed && layout?.autoPadding !== false;

const addReserve = (reserve: Partial<Margins>, side: keyof Margins, value: number): Partial<Margins> => ({
  ...reserve,
  [side]: (reserve[side] ?? 0) + value,
});

export const resolveLabelReserve = (input: LabelLayoutInput): Partial<Margins> => {
  let reserve: Partial<Margins> = input.layout?.padding === undefined ? EMPTY_RESERVE : { ...input.layout.padding };
  if (!reserveEnabled(input.layout)) return reserve;
  for (const item of resolveLabels(input)) {
    if (item.placement.kind !== LayoutPlacementKind.Side) continue;
    if (item.label.reserveSpace ?? defaultReserveOf(item.label)) {
      const side = item.placement.side;
      const amount =
        side === AxisCardinalSide.Top || side === AxisCardinalSide.Bottom
          ? item.bounds.height + item.padding * 2
          : item.bounds.width + item.padding * 2;
      reserve = addReserve(reserve, side, amount);
    }
  }
  return reserve;
};

const targetRectOf = (
  placement: NonNullable<TextLabel['placement']>,
  input: Pick<LowerLabelsInput, 'height' | 'plotArea' | 'width'>,
): Rect => {
  const target = placement.target ?? LayoutPlacementTarget.Frame;
  if (target === LayoutPlacementTarget.View) {
    throw new Error('lowerPlots: label placement target "view" is reserved for composition view layout and is not implemented yet');
  }
  if (target === LayoutPlacementTarget.PlotArea) return input.plotArea;
  return { x: 0, y: 0, width: input.width, height: input.height };
};

const autoAlignOf = (anchor: string | undefined, ratio: number): IRNode['align'] | undefined => {
  if (anchor === LayoutAnchor.Start) return 'left';
  if (anchor === LayoutAnchor.Center) return 'center';
  if (anchor === LayoutAnchor.End) return 'right';
  if (ratio <= 0.1) return 'left';
  if (ratio >= 0.9) return 'right';
  return 'center';
};

const sidePositionOf = (item: ResolvedTextLabel, rect: Rect): [number, number] => {
  if (item.placement.kind !== LayoutPlacementKind.Side) return [rect.x + rect.width / 2, rect.y + rect.height / 2];
  const ratio = placementRatioOf(item.placement);
  const outward = item.placement.target === LayoutPlacementTarget.PlotArea;
  const shiftAlong = item.placement.shift?.along ?? 0;
  const shiftNormal = item.placement.shift?.normal ?? 0;
  const halfWidth = item.bounds.width / 2;
  const halfHeight = item.bounds.height / 2;
  if (item.placement.side === AxisCardinalSide.Top) {
    const y = outward ? rect.y - item.padding - halfHeight - shiftNormal : rect.y + item.padding + halfHeight + shiftNormal;
    return [rect.x + rect.width * ratio + shiftAlong, y];
  }
  if (item.placement.side === AxisCardinalSide.Bottom) {
    const y = outward
      ? rect.y + rect.height + item.padding + halfHeight + shiftNormal
      : rect.y + rect.height - item.padding - halfHeight - shiftNormal;
    return [rect.x + rect.width * ratio + shiftAlong, y];
  }
  if (item.placement.side === AxisCardinalSide.Left) {
    const x = outward ? rect.x - item.padding - halfWidth - shiftNormal : rect.x + item.padding + halfWidth + shiftNormal;
    return [x, rect.y + rect.height * ratio + shiftAlong];
  }
  const x = outward
    ? rect.x + rect.width + item.padding + halfWidth + shiftNormal
    : rect.x + rect.width - item.padding - halfWidth - shiftNormal;
  return [x, rect.y + rect.height * ratio + shiftAlong];
};

const pointPositionOf = (item: ResolvedTextLabel, rect: Rect): [number, number] => {
  if (item.placement.kind !== LayoutPlacementKind.Point) return [rect.x + rect.width / 2, rect.y + rect.height / 2];
  return [rect.x + rect.width * item.placement.x, rect.y + rect.height * item.placement.y];
};

const labelPositionOf = (item: ResolvedTextLabel, input: LowerLabelsInput): [number, number] => {
  const rect = targetRectOf(item.placement, input);
  return item.placement.kind === LayoutPlacementKind.Side ? sidePositionOf(item, rect) : pointPositionOf(item, rect);
};

const labelMetaOf = (label: TextLabel): IRJsonObject => ({
  source: 'plot',
  layer: 'decoration',
  role: label.role ?? PlotLabelRole.Custom,
  ...(label.id !== undefined ? { id: label.id } : {}),
});

export const lowerPlotLabels = (input: LowerLabelsInput): Array<IRScope> => {
  const items = resolveLabels(input);
  if (items.length === 0) return [];
  const groups = new Map<number, Array<ResolvedTextLabel>>();
  for (const item of items) {
    const zIndex = item.label.layer?.zIndex ?? PlotLayerZIndex.PlotLabel;
    groups.set(zIndex, [...(groups.get(zIndex) ?? []), item]);
  }
  return Array.from(groups, ([zIndex, group]) => ({
      type: 'scope',
      zIndex,
      meta: { source: 'plot', layer: 'decoration' },
      nodeDefault: { fill: 'none', stroke: 'none', padding: 0 },
      children: group.map(item => {
        const ratio = placementRatioOf(item.placement);
        const node: IRNode = {
          type: 'node',
          position: labelPositionOf(item, input),
          text: item.label.text,
          align: item.textStyle.align ?? autoAlignOf(item.placement.anchor, ratio),
          meta: labelMetaOf(item.label),
          ...(item.textStyle.font !== undefined ? { font: item.textStyle.font } : {}),
          ...(item.textStyle.textColor !== undefined ? { textColor: item.textStyle.textColor } : {}),
          ...(item.textStyle.opacity !== undefined ? { opacity: item.textStyle.opacity } : {}),
          ...(item.textStyle.lineHeight !== undefined ? { lineHeight: item.textStyle.lineHeight } : {}),
          ...(item.textStyle.maxTextWidth !== undefined ? { maxTextWidth: item.textStyle.maxTextWidth } : {}),
          ...(item.textStyle.rotate !== undefined ? { rotate: item.textStyle.rotate } : {}),
        };
        return node;
      }),
    }));
};
