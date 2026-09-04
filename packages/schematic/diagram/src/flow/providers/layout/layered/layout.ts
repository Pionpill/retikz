import type { BoundsInsets, BoundsRect } from '@retikz/math';

import type {
  EffectiveFlowLayout,
  FlowLayoutElementInput,
  FlowLayoutElementOutput,
  FlowLayoutExecutionContext,
  FlowLayoutInput,
  FlowLayoutOutput,
  FlowLayoutRelationInput,
} from '../../../contract';
import type { FlowDirectionValue } from '../../../shared';
import type { LayeredRankEdge } from './topology';

import { routeLayeredRelations } from './routing';
import { resolveLayeredRanks } from './topology';

type LayeredInputIndex = Readonly<{
  scopes: ReadonlyMap<string, ReadonlyArray<string>>;
  kinds: ReadonlyMap<string, FlowLayoutElementInput['kind']>;
}>;

type SizedElement = Readonly<{
  input: FlowLayoutElementInput;
  width: number;
  height: number;
  margin: Readonly<BoundsInsets>;
  children?: ScopeLayoutResult;
}>;

type PlacedElement = Readonly<{
  input: FlowLayoutElementInput;
  bounds: Readonly<BoundsRect>;
  children?: ScopeLayoutResult;
}>;

type ScopeLayoutResult = Readonly<{
  width: number;
  height: number;
  elements: ReadonlyArray<PlacedElement>;
}>;

const ZERO_INSETS: Readonly<BoundsInsets> = Object.freeze({ top: 0, right: 0, bottom: 0, left: 0 });

const buildInputIndex = (elements: ReadonlyArray<FlowLayoutElementInput>): LayeredInputIndex => {
  const scopes = new Map<string, ReadonlyArray<string>>();
  const kinds = new Map<string, FlowLayoutElementInput['kind']>();
  const visit = (items: ReadonlyArray<FlowLayoutElementInput>, ancestors: ReadonlyArray<string>): void => {
    for (const item of items) {
      scopes.set(item.id, ancestors);
      kinds.set(item.id, item.kind);
      if (item.kind !== 'leaf') visit(item.elements, [...ancestors, item.id]);
    }
  };
  visit(elements, []);
  return { scopes, kinds };
};

const commonScope = (source: ReadonlyArray<string>, target: ReadonlyArray<string>): string | undefined => {
  let result: string | undefined;
  const length = Math.min(source.length, target.length);
  for (let index = 0; index < length; index += 1) {
    if (source[index] !== target[index]) break;
    result = source[index];
  }
  return result;
};

const directChildId = (endpoint: string, scopes: ReadonlyArray<string>, scopeId: string | undefined): string => {
  if (scopeId === undefined) return scopes[0] ?? endpoint;
  const index = scopes.indexOf(scopeId);
  return index < 0 ? endpoint : (scopes[index + 1] ?? endpoint);
};

const rankEdgesForScope = (
  relations: ReadonlyArray<FlowLayoutRelationInput>,
  index: LayeredInputIndex,
  scopeId: string | undefined,
): ReadonlyArray<LayeredRankEdge> =>
  index.kinds.get(scopeId ?? '') === 'layout'
    ? []
    : relations.flatMap(relation => {
        if (relation.direction === 'none' || relation.direction === 'both') return [];
        const sourceScopes = index.scopes.get(relation.source) ?? [];
        const targetScopes = index.scopes.get(relation.target) ?? [];
        if (commonScope(sourceScopes, targetScopes) !== scopeId) return [];
        const authoredSource = directChildId(relation.source, sourceScopes, scopeId);
        const authoredTarget = directChildId(relation.target, targetScopes, scopeId);
        const source = relation.direction === 'reverse' ? authoredTarget : authoredSource;
        const target = relation.direction === 'reverse' ? authoredSource : authoredTarget;
        return source === target ? [] : [{ source, target }];
      });

const sizeElement = (
  input: FlowLayoutElementInput,
  relations: ReadonlyArray<FlowLayoutRelationInput>,
  index: LayeredInputIndex,
  context: FlowLayoutExecutionContext,
): SizedElement => {
  if (input.kind === 'leaf') {
    return { input, width: input.size.width, height: input.size.height, margin: input.margin };
  }
  if (input.kind === 'layout') {
    const sizedChildren = input.elements.map(element => sizeElement(element, relations, index, context));
    const placement = context.placeLayout({
      layout: {
        id: input.id,
        direction: input.layout.direction,
        gap: input.layout.nodeGap,
        align: input.align,
      },
      elements: sizedChildren.map(element => ({
        id: element.input.id,
        size: { width: element.width, height: element.height },
        margin: element.margin,
      })),
    });
    const placementById = new Map(placement.elements.map(element => [element.id, element.bounds]));
    const children: ScopeLayoutResult = {
      width: placement.bounds.width,
      height: placement.bounds.height,
      elements: sizedChildren.map(element => ({
        input: element.input,
        bounds: placementById.get(element.input.id)!,
        ...(element.children === undefined ? {} : { children: element.children }),
      })),
    };
    return {
      input,
      width: placement.bounds.width,
      height: placement.bounds.height,
      margin: ZERO_INSETS,
      children,
    };
  }
  const children = layoutScope(input.elements, input.layout, relations, index, input.id, context);
  return {
    input,
    width: Math.max(input.minimumSize.width, input.contentInsets.left + children.width + input.contentInsets.right),
    height: Math.max(input.minimumSize.height, input.contentInsets.top + children.height + input.contentInsets.bottom),
    margin: ZERO_INSETS,
    children,
  };
};

/** 把物理尺寸与margin投影到统一向右的canonical主轴 */
const projectSizedElementToCanonicalAxes = (element: SizedElement, direction: FlowDirectionValue): SizedElement => {
  if (direction === 'right') return element;
  if (direction === 'left') {
    return {
      ...element,
      margin: { ...element.margin, right: element.margin.left, left: element.margin.right },
    };
  }
  return {
    ...element,
    width: element.height,
    height: element.width,
    margin:
      direction === 'down'
        ? {
            top: element.margin.left,
            right: element.margin.bottom,
            bottom: element.margin.right,
            left: element.margin.top,
          }
        : {
            top: element.margin.left,
            right: element.margin.top,
            bottom: element.margin.right,
            left: element.margin.bottom,
          },
  };
};

const transformBounds = (
  bounds: Readonly<BoundsRect>,
  direction: FlowDirectionValue,
  width: number,
): Readonly<BoundsRect> => {
  if (direction === 'right') return bounds;
  if (direction === 'left') return { ...bounds, x: width - bounds.x - bounds.width };
  if (direction === 'down') {
    return { x: bounds.y, y: bounds.x, width: bounds.height, height: bounds.width };
  }
  return {
    x: bounds.y,
    y: width - bounds.x - bounds.width,
    width: bounds.height,
    height: bounds.width,
  };
};

const layoutScope = (
  inputs: ReadonlyArray<FlowLayoutElementInput>,
  layout: EffectiveFlowLayout,
  relations: ReadonlyArray<FlowLayoutRelationInput>,
  index: LayeredInputIndex,
  scopeId: string | undefined,
  context: FlowLayoutExecutionContext,
): ScopeLayoutResult => {
  const sized = inputs.map(input =>
    projectSizedElementToCanonicalAxes(sizeElement(input, relations, index, context), layout.direction),
  );
  const ranks = resolveLayeredRanks(
    sized.map(element => ({
      id: element.input.id,
      ...(element.input.rank === undefined ? {} : { rank: element.input.rank }),
    })),
    rankEdgesForScope(relations, index, scopeId),
  );
  const rankValues = [...new Set(sized.map(element => ranks.get(element.input.id) ?? 0))].sort((a, b) => a - b);
  const rankLayouts = rankValues.map(rank => {
    const members = sized.filter(element => (ranks.get(element.input.id) ?? 0) === rank);
    const width = Math.max(0, ...members.map(element => element.margin.left + element.width + element.margin.right));
    const height = members.reduce(
      (total, element, memberIndex) =>
        total +
        element.margin.top +
        element.height +
        element.margin.bottom +
        (memberIndex < members.length - 1 ? layout.nodeGap : 0),
      0,
    );
    return { members, width, height };
  });
  const canonical: Array<PlacedElement> = [];
  let rankX = 0;
  let canonicalWidth = 0;
  const canonicalHeight = Math.max(0, ...rankLayouts.map(rank => rank.height));

  for (const rank of rankLayouts) {
    let rankY = (canonicalHeight - rank.height) / 2;
    rank.members.forEach((element, memberIndex) => {
      const bounds = {
        x: rankX + element.margin.left,
        y: rankY + element.margin.top,
        width: element.width,
        height: element.height,
      };
      canonical.push({
        input: element.input,
        bounds,
        ...(element.children === undefined ? {} : { children: element.children }),
      });
      rankY += element.margin.top + element.height + element.margin.bottom;
      if (memberIndex < rank.members.length - 1) rankY += layout.nodeGap;
    });
    canonicalWidth = Math.max(canonicalWidth, rankX + rank.width);
    rankX += rank.width + layout.rankGap;
  }

  const width = layout.direction === 'up' || layout.direction === 'down' ? canonicalHeight : canonicalWidth;
  const height = layout.direction === 'up' || layout.direction === 'down' ? canonicalWidth : canonicalHeight;
  return {
    width,
    height,
    elements: canonical.map(element => ({
      ...element,
      bounds: transformBounds(element.bounds, layout.direction, canonicalWidth),
    })),
  };
};

const flattenElements = (
  elements: ReadonlyArray<PlacedElement>,
  offsetX: number,
  offsetY: number,
  output: Array<FlowLayoutElementOutput>,
): void => {
  for (const element of elements) {
    const bounds = { ...element.bounds, x: element.bounds.x + offsetX, y: element.bounds.y + offsetY };
    output.push({ id: element.input.id, bounds });
    if (element.input.kind !== 'leaf' && element.children !== undefined) {
      if (element.input.kind === 'layout') {
        flattenElements(element.children.elements, bounds.x, bounds.y, output);
        continue;
      }
      const contentWidth = bounds.width - element.input.contentInsets.left - element.input.contentInsets.right;
      const contentHeight = bounds.height - element.input.contentInsets.top - element.input.contentInsets.bottom;
      const horizontalOffset =
        element.input.layout.direction === 'down' || element.input.layout.direction === 'up'
          ? (contentWidth - element.children.width) / 2
          : 0;
      const verticalOffset =
        element.input.layout.direction === 'right' || element.input.layout.direction === 'left'
          ? (contentHeight - element.children.height) / 2
          : 0;
      flattenElements(
        element.children.elements,
        bounds.x + element.input.contentInsets.left + horizontalOffset,
        bounds.y + element.input.contentInsets.top + verticalOffset,
        output,
      );
    }
  }
};

/** 执行内置确定性 layered layout */
export const layoutLayeredFlow = (input: FlowLayoutInput, context: FlowLayoutExecutionContext): FlowLayoutOutput => {
  const index = buildInputIndex(input.elements);
  const root = layoutScope(input.elements, input.layout, input.relations, index, undefined, context);
  const elements: Array<FlowLayoutElementOutput> = [];
  flattenElements(root.elements, 0, 0, elements);
  return {
    elements,
    relations: routeLayeredRelations(input, elements),
  };
};
