import type { LayoutCompositeCompileContext } from '@retikz/core';
import { createGroupBodyAllocation } from '@retikz/graph';
import { createFlexLayout, LayoutItemKind } from '@retikz/layout';
import { compileFlexLayout, intrinsicLayoutProposal } from '@retikz/layout/compose';

import { RetikzDiagramError, RetikzDiagramErrorCode } from '../../../errors';
import type { FlowLayoutElementInput, FlowLayoutInput, FlowLayoutLeafInput } from '../../contract';
import { measureFlowLayoutElement } from '../../providers';
import type { CanonicalFlowDiagram, CanonicalFlowElement, CanonicalFlowEntity } from '../../resolve';
import { createFlowLayoutExecutionContext } from './layout-placement';

/** 容器宽度配置无法满足时报告作者所在位置 */
const widthFailure = (element: CanonicalFlowElement, reason: string): never => {
  throw new RetikzDiagramError({
    code: RetikzDiagramErrorCode.FlowConstraintUnsatisfiable,
    message: `Flow width constraint '${element.id}': ${reason}`,
    details: {
      path: [
        ...element.path,
        element.type === 'layout' && element.source.kind === 'linear' && element.source.containerWidth !== undefined
          ? 'containerWidth'
          : element.type === 'group'
            ? 'children'
            : 'itemWidth',
      ],
      relatedIds: [element.id],
      reason,
    },
  });
};

/** 在共享编排中确定同级容器预算，再重测需要增长的直接节点 */
export const allocateFlowContainerWidths = (
  diagram: CanonicalFlowDiagram,
  input: FlowLayoutInput,
  context: LayoutCompositeCompileContext,
  remeasure: (entity: CanonicalFlowEntity, allocatedWidth: number) => FlowLayoutLeafInput,
): FlowLayoutInput => {
  const authored = new Map<string, CanonicalFlowElement>();

  const collect = (elements: ReadonlyArray<CanonicalFlowElement>): void => {
    for (const element of elements) {
      authored.set(element.id, element);
      if (element.type !== 'entity') collect(element.elements);
    }
  };

  collect(diagram.elements);
  const allocatedRows = new Set<string>();
  const placement = createFlowLayoutExecutionContext(context, input);
  const naturalSize = (element: FlowLayoutElementInput) => measureFlowLayoutElement(element, input, placement);

  const rowOf = (element: FlowLayoutElementInput): Extract<FlowLayoutElementInput, { kind: 'layout' }> => {
    const row = element.kind === 'group' && element.elements.length === 1 ? element.elements[0] : element;
    if (
      row.kind !== 'layout' ||
      row.placement.kind !== 'linear' ||
      !['left', 'right'].includes(row.placement.direction) ||
      row.placement.excludeFromBounds?.length ||
      row.elements.some(child => child.kind !== 'leaf')
    ) {
      return widthFailure(
        authored.get(element.id)!,
        'Expected a horizontal Entity-only row, or a Group with exactly one such content root.',
      );
    }

    const owner = authored.get(row.id)!;
    if (owner.type === 'layout' && owner.source.kind === 'linear' && owner.source.containerWidth !== undefined)
      return widthFailure(owner, 'A horizontal receiving row cannot itself declare containerWidth.');

    return row;
  };

  const growRow = (row: Extract<FlowLayoutElementInput, { kind: 'layout' }>, width: number): FlowLayoutElementInput => {
    allocatedRows.add(row.id);
    const owner = authored.get(row.id)!;
    if (owner.type !== 'layout') return widthFailure(owner, 'Expected a Layout.');

    const natural = naturalSize(row).width;
    const tolerance = Number.EPSILON * 64 * Math.max(1, width, natural);
    if (width < natural - tolerance) return widthFailure(owner, 'Allocated width cannot shrink natural content.');

    const extra = Math.max(0, width - natural);
    if (owner.source.itemWidth !== 'fill' || extra <= tolerance) return { ...row, allocatedWidth: width };

    const eligible = row.elements.filter(child => {
      const entity = authored.get(child.id)!;
      return entity.type === 'entity' && entity.graph.layout?.width === undefined;
    });
    if (eligible.length === 0) return widthFailure(owner, 'Positive free width requires a non-fixed Entity.');

    const flex = createFlexLayout({
      size: { x: { kind: 'fixed', value: extra } },
      children: eligible.map(child => ({
        kind: LayoutItemKind.Flex,
        key: child.id,
        basis: 0,
        grow: 1,
        shrink: 0,
        child: createGroupBodyAllocation({ x: 0, y: 0, width: 0, height: 0 }),
      })),
    });
    const children = (flex.children ?? []).map(item => context.bindChild(item.child, []));
    const artifact = compileFlexLayout(flex, {
      ...context,
      proposal: intrinsicLayoutProposal('natural'),
      sourceChild: path => children[path[1] as number],
    }).artifact;
    if (artifact === undefined) return widthFailure(owner, 'Flex allocation returned no artifact.');

    const increments = new Map(artifact.items.map(item => [item.key, item.slotBounds.width]));

    return {
      ...row,
      allocatedWidth: width,
      elements: row.elements.map(child => {
        const increment = increments.get(child.id);
        if (increment === undefined || child.kind !== 'leaf') return child;

        const entity = authored.get(child.id)!;
        if (entity.type !== 'entity') return widthFailure(owner, 'Expected an Entity.');

        return remeasure(entity, child.size.width + increment);
      }),
    };
  };

  const visit = (elements: ReadonlyArray<FlowLayoutElementInput>): ReadonlyArray<FlowLayoutElementInput> =>
    elements.map(element => {
      if (element.kind === 'leaf') return element;

      const owner = authored.get(element.id)!;
      if (owner.type !== 'layout' || owner.source.kind !== 'linear' || owner.source.containerWidth === undefined)
        return { ...element, elements: visit(element.elements) };
      if (!['up', 'down'].includes(owner.source.direction) || owner.source.excludeFromBounds?.length)
        return widthFailure(
          owner,
          'containerWidth requires a vertical linear container with all children included in bounds.',
        );

      for (const child of element.elements) rowOf(child);
      const width = Math.max(...element.elements.map(child => naturalSize(child).width));

      return {
        ...element,
        elements: element.elements.map(child => {
          const row = rowOf(child);
          if (child.kind === 'group')
            return {
              ...child,
              allocatedWidth: width,
              elements: [growRow(row, width - child.contentInsets.left - child.contentInsets.right)],
            };

          return growRow(row, width);
        }),
      };
    });
  const elements = visit(input.elements);

  for (const owner of authored.values()) {
    if (owner.type === 'layout' && owner.source.itemWidth === 'fill' && !allocatedRows.has(owner.id))
      widthFailure(owner, 'fill requires a horizontal row receiving a parent containerWidth allocation.');
  }

  return { ...input, elements };
};
