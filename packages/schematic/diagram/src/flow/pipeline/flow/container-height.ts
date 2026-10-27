import type { CompositeCompileContext } from '@retikz/core';

import { RetikzDiagramError, RetikzDiagramErrorCode } from '../../../errors';
import type { InputFlowLayoutElement, InputFlowLayoutComputation } from '../../contract';
import { measureFlowLayoutElement } from '../../providers';
import type { CanonicalFlowDiagram, CanonicalFlowElement } from '../../resolve';
import { createFlowLayoutExecutionContext } from './layout-placement';

/** 自内向外统一分组高度，并把纵向线性内容的剩余空间分配到间隙 */
export const allocateFlowGroupHeights = (
  diagram: CanonicalFlowDiagram,
  input: InputFlowLayoutComputation,
  context: CompositeCompileContext,
): InputFlowLayoutComputation => {
  const placement = createFlowLayoutExecutionContext(context, input);
  /** 沿单子项透明容器传递内容高度，仅扩展纵向线性布局的间隙 */
  const distributeHeight = (element: InputFlowLayoutElement, height: number): InputFlowLayoutElement => {
    if (element.kind !== 'layout' || element.placement.kind !== 'linear' || element.placement.excludeFromBounds?.length)
      return element;

    const natural = measureFlowLayoutElement(element, input, placement).height;
    const extra = Math.max(0, height - natural);
    if (extra === 0) return element;

    if (element.elements.length === 1) {
      const child = element.elements[0];
      const childHeight = measureFlowLayoutElement(child, input, placement).height;
      return { ...element, elements: [distributeHeight(child, childHeight + extra)] };
    }
    if (!['down', 'up'].includes(element.placement.direction) || element.elements.length < 2) return element;

    return {
      ...element,
      placement: { ...element.placement, gap: element.placement.gap + extra / (element.elements.length - 1) },
    };
  };

  const visit = (
    elements: ReadonlyArray<InputFlowLayoutElement>,
    sources: ReadonlyArray<CanonicalFlowElement>,
  ): ReadonlyArray<InputFlowLayoutElement> =>
    elements.map((element, index) => {
      const owner = sources[index];
      if (element.kind === 'leaf' || owner.type === 'entity') return element;

      const children = visit(element.elements, owner.elements);
      if (owner.type !== 'layout' || owner.source.kind !== 'linear' || owner.source.containerHeight === undefined)
        return { ...element, elements: children };

      if (
        !['left', 'right'].includes(owner.source.direction) ||
        owner.source.excludeFromBounds?.length ||
        children.some(child => child.kind !== 'group')
      ) {
        throw new RetikzDiagramError({
          code: RetikzDiagramErrorCode.FlowConstraintUnsatisfiable,
          message: `Flow Layout '${owner.id}': containerHeight requires a horizontal linear layout containing only Groups, with all children included in bounds.`,
          details: {
            path: [...owner.path, 'containerHeight'],
            relatedIds: [owner.id, ...children.map(child => child.id)],
          },
        });
      }

      const height = Math.max(...children.map(child => measureFlowLayoutElement(child, input, placement).height));
      return {
        ...element,
        elements: children.map(child => {
          if (child.kind !== 'group') return child;
          const contentHeight = Math.max(0, height - child.contentInsets.top - child.contentInsets.bottom);
          return {
            ...child,
            allocatedHeight: height,
            elements:
              child.elements.length === 1 ? [distributeHeight(child.elements[0], contentHeight)] : child.elements,
          };
        }),
      };
    });

  return { ...input, elements: visit(input.elements, diagram.elements) };
};
