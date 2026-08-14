import type {
  IRChild,
  IRComposite,
  LayoutChildResult,
  LayoutCompositeCompileContext,
  LayoutCompositeCompileResult,
  LayoutProposal,
} from '@retikz/core';
import type {
  IRFlexLayout,
  IRFlexLayoutItem,
  LayoutArtifactItemBase,
  LayoutArtifactRect,
  LayoutRect,
} from '@retikz/layout/compose';

import { LayoutAxisProposalKind, LayoutChildProbeKind, LayoutIntrinsicMode } from '@retikz/core';
import { LAYOUT_NAMESPACE } from '@retikz/layout';
import {
  compileFlexLayout,
  createLayoutArtifactItem,
  FlexLayoutDirection,
  FlexLayoutWrap,
  LayoutAlignment,
  LayoutDistribution,
  LayoutOverflow,
  normalizeLayoutSpacing,
  unionLayoutArtifactRects,
} from '@retikz/layout/compose';

import type { LogicLayoutItemArtifact } from '../../shared';
import type { LogicNodeVariantValue } from '../../unit';
import type { IRLogicFrame, LogicFrameArtifact } from './types';

import { NOTATION_NAMESPACE, NotationElementType } from '../../shared';

type LogicFrameRegion = Readonly<{
  key: string;
  role?: string;
  child: IRChild;
  padding: IRLogicFrame['padding'];
}>;

type DividerReplay = Readonly<{
  visualBounds: LayoutArtifactRect;
  replay: ReturnType<LayoutCompositeCompileContext['replay']>;
}>;

const intrinsicProposal = (mode: 'minimum' | 'natural'): LayoutProposal => ({
  x: {
    kind: LayoutAxisProposalKind.Intrinsic,
    mode: mode === 'minimum' ? LayoutIntrinsicMode.Minimum : LayoutIntrinsicMode.Natural,
  },
  y: {
    kind: LayoutAxisProposalKind.Intrinsic,
    mode: mode === 'minimum' ? LayoutIntrinsicMode.Minimum : LayoutIntrinsicMode.Natural,
  },
});

const exactProposal = (width: number, height: number): LayoutProposal => ({
  x: { kind: LayoutAxisProposalKind.Exact, value: width },
  y: { kind: LayoutAxisProposalKind.Exact, value: height },
});

const requiredProbe = (
  context: LayoutCompositeCompileContext,
  child: IRChild,
  proposal: LayoutProposal,
): LayoutChildResult => {
  const probe = context.layoutChild(child, proposal);
  if (probe.kind === LayoutChildProbeKind.Failed) return context.raise(probe.failure);
  return probe.result;
};

const stripItemIdentity = (item: LayoutArtifactItemBase & { line?: number }): LogicLayoutItemArtifact => {
  const { key, sourceIndex, line, ...artifact } = item;
  void key;
  void sourceIndex;
  void line;
  return artifact;
};

const positiveRectOrNull = (rect: LayoutArtifactRect): LayoutArtifactRect | null =>
  rect.width > 0 && rect.height > 0 ? rect : null;

const positiveUnion = (rects: ReadonlyArray<LayoutArtifactRect>): LayoutArtifactRect => {
  const positive = rects.filter(rect => positiveRectOrNull(rect) !== null);
  return unionLayoutArtifactRects(positive);
};

const visibleUnion = (rects: ReadonlyArray<LayoutArtifactRect | null>): LayoutArtifactRect | null => {
  const positive = rects.flatMap(rect => (rect === null || positiveRectOrNull(rect) === null ? [] : [rect]));
  return positive.length === 0 ? null : unionLayoutArtifactRects(positive);
};

const shellNodeOf = (node: IRLogicFrame, allocation: LayoutRect): IRChild => ({
  type: 'node',
  id: node.id,
  position: [allocation.x + allocation.width / 2, allocation.y + allocation.height / 2],
  shape: { type: 'rectangle', params: { cornerRadius: node.appearance.cornerRadius } },
  boundary: 'shape',
  minimumSize: { width: allocation.width, height: allocation.height },
  padding: 0,
  ...node.appearance.style,
  ...(node.appearance.dashPattern === undefined ? {} : { dashPattern: node.appearance.dashPattern }),
  ...(node.appearance.dashOffset === undefined ? {} : { dashOffset: node.appearance.dashOffset }),
});

const dividerPathOf = (node: IRLogicFrame, x: number, y: number, width: number): IRChild => {
  const divider = node.appearance.divider;
  if (divider === false) throw new Error('Cannot construct a divider path when divider is disabled');
  return {
    type: 'path',
    children: [
      { type: 'step', kind: 'move', to: [x, y] },
      { type: 'step', kind: 'line', to: [x + width, y] },
    ],
    ...(divider.color === undefined ? {} : { color: divider.color }),
    stroke: divider.stroke,
    strokeWidth: divider.strokeWidth,
    ...(divider.strokeOpacity === undefined ? {} : { strokeOpacity: divider.strokeOpacity }),
    opacity: divider.opacity,
    ...(divider.dashPattern === undefined ? {} : { dashPattern: divider.dashPattern }),
    ...(divider.dashOffset === undefined ? {} : { dashOffset: divider.dashOffset }),
    ...(divider.lineCap === undefined ? {} : { lineCap: divider.lineCap }),
    ...(divider.lineJoin === undefined ? {} : { lineJoin: divider.lineJoin }),
  };
};

const regionsOf = (node: IRLogicFrame): ReadonlyArray<LogicFrameRegion> => [
  ...(node.header === undefined
    ? []
    : [
        {
          key: '__logic_block_header__',
          child: node.header.child,
          padding: node.header.padding ?? node.padding,
        },
      ]),
  ...node.sections.map(section => ({
    key: `__logic_block_section__${section.key}`,
    role: section.role,
    child: section.child,
    padding: section.padding ?? node.padding,
  })),
];

const logicNodeTypes = new Set<string>([
  NotationElementType.Terminal,
  NotationElementType.Stage,
  NotationElementType.Decision,
  NotationElementType.Junction,
]);

const isNotationComposite = (child: IRChild): child is IRComposite => 'namespace' in child;

/** 把最近的 LogicFrame variant 作用域递归投影到可承载逻辑节点的子容器 */
const applyLogicNodeVariant = (child: IRChild, inheritedVariant: LogicNodeVariantValue | undefined): IRChild => {
  if (isNotationComposite(child)) {
    if (child.namespace === NOTATION_NAMESPACE && child.type === NotationElementType.LogicFrame) {
      const frame = child as unknown as IRLogicFrame;
      const frameVariant = frame.logicNodeVariant ?? inheritedVariant;
      return {
        ...frame,
        ...(frame.header === undefined
          ? {}
          : { header: { ...frame.header, child: applyLogicNodeVariant(frame.header.child, frameVariant) } }),
        sections: frame.sections.map(section => ({
          ...section,
          child: applyLogicNodeVariant(section.child, frameVariant),
        })),
      };
    }
    if (child.namespace === NOTATION_NAMESPACE && logicNodeTypes.has(child.type)) {
      const unit = child as IRComposite & { variant?: LogicNodeVariantValue };
      return unit.variant === undefined && inheritedVariant !== undefined
        ? { ...unit, variant: inheritedVariant }
        : unit;
    }
    return child;
  }
  if (child.type === 'scope') {
    return { ...child, children: child.children.map(nested => applyLogicNodeVariant(nested, inheritedVariant)) };
  }
  return child;
};

const syntheticFlexOf = (node: IRLogicFrame, regions: ReadonlyArray<LogicFrameRegion>): IRFlexLayout => {
  const divider = node.appearance.divider;
  const strokeWidth = divider === false ? 0 : divider.strokeWidth;
  const effectiveGap = node.rowGap + (divider === false ? 0 : strokeWidth);
  const children: Array<IRFlexLayoutItem> = regions.map(region => ({
    kind: 'flex',
    key: region.key,
    child: region.child,
    margin: region.padding,
    basis: 'content',
    grow: 0,
    shrink: 1,
  }));
  return {
    namespace: LAYOUT_NAMESPACE,
    type: 'flexLayout',
    size: node.size,
    padding: 0,
    overflow: node.overflow,
    direction: FlexLayoutDirection.Column,
    wrap: FlexLayoutWrap.NoWrap,
    gap: { column: 0, row: effectiveGap },
    justifyContent: LayoutDistribution.Start,
    alignItems: LayoutAlignment.Stretch,
    alignContent: LayoutDistribution.Start,
    children,
  };
};

/** 通过规范的纵向 FlexLayout 编译器编译 Notation LogicFrame */
export const compileLogicFrame = (
  node: IRLogicFrame,
  context: LayoutCompositeCompileContext,
): LayoutCompositeCompileResult<LogicFrameArtifact> => {
  const regions = regionsOf(node).map(region => ({
    ...region,
    child: applyLogicNodeVariant(region.child, node.logicNodeVariant),
  }));
  const synthetic = syntheticFlexOf(node, regions);
  const flexResult = compileFlexLayout(synthetic, context);
  const flexArtifact = flexResult.artifact;
  if (flexArtifact === undefined) throw new Error('LogicFrame FlexLayout owner returned no artifact');
  const allocation = flexResult.allocationBounds ?? flexArtifact.container.allocationBounds;
  const content = flexArtifact.container.contentBounds;

  const shellProbe = requiredProbe(
    context,
    shellNodeOf(node, allocation),
    exactProposal(allocation.width, allocation.height),
  );
  const shellItem = createLayoutArtifactItem({
    key: 'shell',
    sourceIndex: 0,
    margin: normalizeLayoutSpacing(0),
    slotBounds: allocation,
    result: shellProbe,
    translation: { x: 0, y: 0 },
    containerAllocation: allocation,
    overflow: LayoutOverflow.Visible,
  });

  const dividerReplays: Array<DividerReplay> = [];
  const divider = node.appearance.divider;
  if (divider !== false && divider.strokeWidth > 0) {
    const items = flexArtifact.items;
    for (let index = 0; index + 1 < items.length; index += 1) {
      const previous = items[index];
      const centerline =
        previous.marginBounds.y + previous.marginBounds.height + node.rowGap / 2 + divider.strokeWidth / 2;
      const pathProbe = requiredProbe(
        context,
        dividerPathOf(node, content.x, centerline, content.width),
        intrinsicProposal('natural'),
      );
      const visualBounds =
        positiveRectOrNull(pathProbe.visualBounds) === null
          ? Object.freeze({ x: 0, y: 0, width: 0, height: 0 })
          : pathProbe.visualBounds;
      dividerReplays.push({
        visualBounds,
        replay: context.replay(pathProbe),
      });
    }
  }

  const shellVisualBounds = positiveRectOrNull(shellItem.visualBounds);
  const dividerVisualBounds = dividerReplays.map(value => value.visualBounds);
  const containerVisualBounds = flexArtifact.container.visualBounds;
  const outerVisualBounds = positiveUnion([
    ...(shellVisualBounds === null ? [] : [shellVisualBounds]),
    containerVisualBounds,
    ...dividerVisualBounds,
  ]);
  const outerVisibleBounds = visibleUnion([
    shellItem.visibleBounds,
    flexArtifact.container.visibleBounds,
    ...dividerReplays.map(value => positiveRectOrNull(value.visualBounds)),
  ]);

  const itemsBySource = flexArtifact.items;
  const header = node.header === undefined ? null : stripItemIdentity(itemsBySource[0]);
  const sectionOffset = node.header === undefined ? 0 : 1;
  const sections = node.sections.map((section, index) => ({
    key: section.key,
    ...(section.role === undefined ? {} : { role: section.role }),
    geometry: stripItemIdentity(itemsBySource[index + sectionOffset]),
  }));

  const artifact: LogicFrameArtifact = Object.freeze({
    kind: NotationElementType.LogicFrame,
    id: node.id,
    outer: Object.freeze({
      allocationBounds: allocation,
      shellVisualBounds,
      visualBounds: outerVisualBounds,
      visibleBounds: outerVisibleBounds,
    }),
    container: flexArtifact.container,
    header,
    sections,
    dividerVisualBounds,
  });

  const output = context.scope({ zIndex: node.appearance.zIndex }, [
    context.replay(shellProbe),
    ...flexResult.children,
    ...dividerReplays.map(value => value.replay),
  ]);
  return {
    children: [output],
    allocationBounds: allocation,
    artifact,
  };
};
