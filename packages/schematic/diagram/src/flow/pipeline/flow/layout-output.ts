import {
  AnchorRefSchema,
  BendAngleSchema,
  BendInAngleSchema,
  BendLoosenessSchema,
  BendOutAngleSchema,
  SmoothTensionSchema,
} from '@retikz/core';
import { cloneAndFreezeJson, jsonStructuralEquals } from '@retikz/foundation';
import type { BoundsInsets, BoundsRect, Position } from '@retikz/math';
import type { ZodType } from 'zod';

import { RetikzDiagramError, RetikzDiagramErrorCode } from '../../../errors';
import type {
  FlowLayoutDefinition,
  InputFlowLayoutElement,
  FlowLayoutElementOutput,
  FlowLayoutExecutionContext,
  InputFlowLayoutComputation,
  FlowLayoutOutput,
  InputFlowLayoutPlacement,
  FlowLayoutPlacementOutput,
  InputFlowLayoutRelation,
  FlowLayoutRoute,
} from '../../contract';
import { coincidentFlowEndpoints, resolveFlowEndpointPosition, createFlowOrthogonalCandidates } from '../../providers';
import { flowBendGeometryFailure, flowRouteLabelBounds } from '../../providers';
import type { FlowEndpointTarget } from '../../schemas';
import { FlowRoutingKind } from '../../shared';
import { FLOW_BEND_ANGLES } from '../../shared/geometry';

const invalidOutput = (
  definition: FlowLayoutDefinition,
  path: ReadonlyArray<string | number>,
  reason: string,
  relatedIds?: ReadonlyArray<string>,
  cause?: unknown,
): never => {
  throw new RetikzDiagramError({
    code: RetikzDiagramErrorCode.FlowLayoutOutputInvalid,
    message: `Flow Layout Definition '${definition.name}' returned invalid output: ${reason}`,
    details: {
      definition: definition.name,
      path,
      reason,
      ...(relatedIds === undefined ? {} : { relatedIds }),
    },
    cause,
  });
};

const callbackFailed = (definition: FlowLayoutDefinition, reason: string, cause?: unknown): never => {
  throw new RetikzDiagramError({
    code: RetikzDiagramErrorCode.DefinitionCallbackFailed,
    message: `Flow Layout Definition '${definition.name}' callback failed: ${reason}`,
    details: { capability: 'flow-layout', definition: definition.name, reason },
    cause,
  });
};

/** 检查布局计算后才产生的有限数值约束 */
const resolveFiniteNumber = (
  value: number,
  definition: FlowLayoutDefinition,
  path: ReadonlyArray<string | number>,
): number => {
  if (!Number.isFinite(value)) return invalidOutput(definition, path, 'expected a finite number.');
  return value;
};

/** 消费类型化边界，并检查计算结果的有限性与非负尺寸 */
const resolveBounds = (
  value: Readonly<BoundsRect>,
  definition: FlowLayoutDefinition,
  path: ReadonlyArray<string | number>,
): Readonly<BoundsRect> => {
  const bounds = {
    x: resolveFiniteNumber(value.x, definition, [...path, 'x']),
    y: resolveFiniteNumber(value.y, definition, [...path, 'y']),
    width: resolveFiniteNumber(value.width, definition, [...path, 'width']),
    height: resolveFiniteNumber(value.height, definition, [...path, 'height']),
  };
  if (bounds.width < 0 || bounds.height < 0) invalidOutput(definition, path, 'bounds size must be non-negative.');

  return bounds;
};

const collapsePoints = (points: ReadonlyArray<Position>): ReadonlyArray<Position> =>
  points.filter(
    (point, index) => index === 0 || point[0] !== points[index - 1]?.[0] || point[1] !== points[index - 1]?.[1],
  );

const flattenElements = (elements: ReadonlyArray<InputFlowLayoutElement>): ReadonlyArray<InputFlowLayoutElement> =>
  elements.flatMap(element => [element, ...(element.kind === 'leaf' ? [] : flattenElements(element.elements))]);

/** 判断两个有限布局数值是否满足带尺度 epsilon 的小于等于关系 */
const layoutLessThanOrEqual = (left: number, right: number): boolean =>
  left <= right + Math.max(1, Math.abs(left), Math.abs(right)) * Number.EPSILON * 64;

const containsBounds = (container: Readonly<BoundsRect>, child: Readonly<BoundsRect>): boolean =>
  layoutLessThanOrEqual(container.x, child.x) &&
  layoutLessThanOrEqual(container.y, child.y) &&
  layoutLessThanOrEqual(child.x + child.width, container.x + container.width) &&
  layoutLessThanOrEqual(child.y + child.height, container.y + container.height);

const insetBounds = (bounds: Readonly<BoundsRect>, insets: Readonly<BoundsInsets>): Readonly<BoundsRect> => ({
  x: bounds.x + insets.left,
  y: bounds.y + insets.top,
  width: bounds.width - insets.left - insets.right,
  height: bounds.height - insets.top - insets.bottom,
});

const marginBounds = (bounds: Readonly<BoundsRect>, insets: Readonly<BoundsInsets>): Readonly<BoundsRect> => ({
  x: bounds.x - insets.left,
  y: bounds.y - insets.top,
  width: bounds.width + insets.left + insets.right,
  height: bounds.height + insets.top + insets.bottom,
});

const overlaps = (left: Readonly<BoundsRect>, right: Readonly<BoundsRect>): boolean =>
  left.x < right.x + right.width &&
  left.x + left.width > right.x &&
  left.y < right.y + right.height &&
  left.y + left.height > right.y;

const assertElementGeometry = (
  elements: ReadonlyArray<InputFlowLayoutElement>,
  boundsById: ReadonlyMap<string, Readonly<BoundsRect>>,
  definition: FlowLayoutDefinition,
): void => {
  for (const element of flattenElements(elements)) {
    const bounds = boundsById.get(element.id);
    if (bounds === undefined) return invalidOutput(definition, ['elements'], 'missing element bounds.', [element.id]);
    if (element.kind === 'leaf') {
      if (bounds.width !== element.size.width || bounds.height !== element.size.height) {
        invalidOutput(definition, ['elements'], 'leaf bounds must preserve measured size.', [element.id]);
      }
      continue;
    }

    if (
      element.allocatedWidth !== undefined &&
      Math.abs(bounds.width - element.allocatedWidth) >
        Number.EPSILON * 64 * Math.max(1, bounds.width, element.allocatedWidth)
    ) {
      invalidOutput(definition, ['elements'], 'Container bounds must preserve allocated width.', [element.id]);
    }

    if (
      element.kind === 'group' &&
      element.allocatedHeight !== undefined &&
      Math.abs(bounds.height - element.allocatedHeight) >
        Number.EPSILON * 64 * Math.max(1, bounds.height, element.allocatedHeight)
    ) {
      invalidOutput(definition, ['elements'], 'Group bounds must preserve allocated height.', [element.id]);
    }

    if (
      element.kind === 'group' &&
      (bounds.width < element.minimumSize.width || bounds.height < element.minimumSize.height)
    ) {
      invalidOutput(definition, ['elements'], 'Group bounds are smaller than the measured shell minimum.', [
        element.id,
      ]);
    }

    const contentInsets = element.kind === 'group' ? element.contentInsets : { top: 0, right: 0, bottom: 0, left: 0 };
    const contentBounds = insetBounds(bounds, contentInsets);
    if (contentBounds.width < 0 || contentBounds.height < 0) {
      invalidOutput(definition, ['elements'], 'Flow scope content insets exceed its bounds.', [element.id]);
    }

    const containedChildren = element.kind === 'group' ? flattenElements(element.elements) : element.elements;

    for (const child of containedChildren) {
      if (element.kind === 'layout' && element.placement.excludeFromBounds?.includes(child.id)) continue;

      const childBounds = boundsById.get(child.id);
      if (childBounds === undefined || !containsBounds(contentBounds, childBounds)) {
        invalidOutput(definition, ['elements'], 'Flow scope content bounds must contain every direct child.', [
          element.id,
          child.id,
        ]);
      }
    }
  }

  const visitScope = (scopeElements: ReadonlyArray<InputFlowLayoutElement>): void => {
    for (let leftIndex = 0; leftIndex < scopeElements.length; leftIndex += 1) {
      const left = scopeElements[leftIndex];
      const leftBounds = boundsById.get(left.id);
      if (leftBounds === undefined) continue;

      const leftCollisionBounds = left.kind === 'leaf' ? marginBounds(leftBounds, left.margin) : leftBounds;

      for (let rightIndex = leftIndex + 1; rightIndex < scopeElements.length; rightIndex += 1) {
        const right = scopeElements[rightIndex];
        const rightBounds = boundsById.get(right.id);
        if (rightBounds === undefined) continue;

        const rightCollisionBounds = right.kind === 'leaf' ? marginBounds(rightBounds, right.margin) : rightBounds;
        if (overlaps(leftCollisionBounds, rightCollisionBounds)) {
          invalidOutput(definition, ['elements'], 'non-ancestor sibling collision bounds must not overlap.', [
            left.id,
            right.id,
          ]);
        }
      }

      if (left.kind !== 'leaf') visitScope(left.elements);
    }
  };

  visitScope(elements);
};

type PlacementRecord = Readonly<{
  input: InputFlowLayoutPlacement;
  output: FlowLayoutPlacementOutput;
}>;

const assertPlacementInput = (
  definition: FlowLayoutDefinition,
  expected: Extract<InputFlowLayoutElement, { kind: 'layout' }>,
  input: InputFlowLayoutPlacement,
): void => {
  if (input.layout.id !== expected.id || input.layout.kind !== expected.placement.kind) {
    invalidOutput(definition, ['layouts', expected.id, 'layout'], 'Layout placement configuration must match input.', [
      expected.id,
    ]);
  }

  const actual = input.layout;
  const placement = expected.placement;
  if (JSON.stringify(actual.excludeFromBounds) !== JSON.stringify(placement.excludeFromBounds)) {
    invalidOutput(
      definition,
      ['layouts', expected.id, 'layout', 'excludeFromBounds'],
      'Layout exclusion must match input.',
      [expected.id],
    );
  }

  const matches =
    actual.kind === 'linear' && placement.kind === 'linear'
      ? actual.direction === placement.direction && actual.gap === placement.gap && actual.align === placement.align
      : actual.kind === 'grid' &&
        placement.kind === 'grid' &&
        actual.gap.row === placement.gap.row &&
        actual.gap.column === placement.gap.column &&
        jsonStructuralEquals(actual.placements, placement.placements);
  if (!matches)
    invalidOutput(definition, ['layouts', expected.id, 'layout'], 'Layout placement configuration must match input.', [
      expected.id,
    ]);

  if (
    input.elements.length !== expected.elements.length ||
    input.elements.some((element, index) => element.id !== expected.elements[index]?.id)
  ) {
    invalidOutput(
      definition,
      ['layouts', expected.id, 'elements'],
      'Layout direct child ids and order must match input.',
      [expected.id],
    );
  }
};

const resolvePlacementOutput = (
  definition: FlowLayoutDefinition,
  input: InputFlowLayoutPlacement,
  value: FlowLayoutPlacementOutput,
): FlowLayoutPlacementOutput => {
  const path = ['layouts', input.layout.id] as const;
  if (value.elements.length !== input.elements.length) {
    invalidOutput(definition, [...path, 'elements'], 'Layout placement coverage must match direct children.', [
      input.layout.id,
    ]);
  }

  const elements = value.elements.map((element, index) => {
    const elementPath = [...path, 'elements', index] as const;
    const expected = input.elements[index];
    if (element.id !== expected.id) {
      return invalidOutput(definition, elementPath, 'Layout placement child ids and order must match input.', [
        expected.id,
      ]);
    }

    const bounds = resolveBounds(element.bounds, definition, [...elementPath, 'bounds']);
    if (bounds.width !== expected.size.width || bounds.height !== expected.size.height) {
      invalidOutput(definition, [...elementPath, 'bounds'], 'Layout placement must preserve measured child size.', [
        expected.id,
      ]);
    }

    return { id: expected.id, bounds };
  });

  return { bounds: resolveBounds(value.bounds, definition, [...path, 'bounds']), elements };
};

const assertRecordedPlacements = (
  definition: FlowLayoutDefinition,
  input: InputFlowLayoutComputation,
  output: FlowLayoutOutput,
  records: ReadonlyMap<string, PlacementRecord>,
): void => {
  const boundsById = new Map(output.elements.map(element => [element.id, element.bounds]));

  for (const layout of flattenElements(input.elements).filter(
    (element): element is Extract<InputFlowLayoutElement, { kind: 'layout' }> => element.kind === 'layout',
  )) {
    const record = records.get(layout.id);
    if (record === undefined) {
      return invalidOutput(
        definition,
        ['layouts', layout.id],
        'each authored Layout must call placeLayout exactly once.',
        [layout.id],
      );
    }

    const layoutBounds = boundsById.get(layout.id)!;
    if (layoutBounds.width !== record.output.bounds.width || layoutBounds.height !== record.output.bounds.height) {
      invalidOutput(definition, ['elements'], 'Layout bounds must match placeLayout output.', [layout.id]);
    }

    record.output.elements.forEach(child => {
      const childBounds = boundsById.get(child.id)!;
      const expectedX = layoutBounds.x + child.bounds.x - record.output.bounds.x;
      const expectedY = layoutBounds.y + child.bounds.y - record.output.bounds.y;
      if (
        childBounds.x !== expectedX ||
        childBounds.y !== expectedY ||
        childBounds.width !== child.bounds.width ||
        childBounds.height !== child.bounds.height
      ) {
        invalidOutput(definition, ['elements'], 'Layout direct child bounds must preserve placeLayout output.', [
          layout.id,
          child.id,
        ]);
      }
    });
  }
};

const assertRoute = (
  relation: InputFlowLayoutRelation,
  route: FlowLayoutRoute,
  labelBounds: Readonly<BoundsRect> | undefined,
  boundsById: ReadonlyMap<string, Readonly<BoundsRect>>,
  definition: FlowLayoutDefinition,
  relationIndex: number,
  endpoints: Readonly<{ source: FlowEndpointTarget; target: FlowEndpointTarget }>,
  elements: ReadonlyArray<FlowLayoutElementOutput>,
  context: FlowLayoutExecutionContext,
): void => {
  const points = route.points;
  const path = ['relations', relationIndex] as const;
  const relatedIds = [relation.source.id, relation.target.id];
  if (route.kind !== relation.routing.kind)
    invalidOutput(definition, [...path, 'route', 'kind'], 'route kind must match input.', relatedIds);

  for (const [key, value] of Object.entries(relation.routing)) {
    // smooth 输入是 Target，输出是完整数值 knots；稍后用最终布局重新查询逐项核对
    if (relation.routing.kind === 'smooth' && key === 'points') continue;
    if (
      value !== undefined &&
      (Array.isArray(value)
        ? JSON.stringify(Reflect.get(route, key)) !== JSON.stringify(value)
        : Reflect.get(route, key) !== value)
    )
      invalidOutput(definition, [...path, 'route', key], 'route parameters must preserve effective input.', relatedIds);
  }

  if (relation.routing.kind === 'bend' && route.kind === 'bend') {
    if ('outAngle' in relation.routing !== 'outAngle' in route)
      invalidOutput(definition, [...path, 'route'], 'bend parameter family must preserve effective input.', relatedIds);
    if (
      !('outAngle' in relation.routing) &&
      relation.routing.bendAngle === undefined &&
      'bendAngle' in route &&
      !FLOW_BEND_ANGLES.includes(route.bendAngle)
    )
      invalidOutput(
        definition,
        [...path, 'route', 'bendAngle'],
        'automatic bend angle must be 30, 45 or 60.',
        relatedIds,
      );
  }

  if (points.length < 2)
    invalidOutput(definition, [...path, 'points'], 'route must contain at least two distinct points.', relatedIds);
  if (relation.routing.kind === 'straight' && points.length !== 2) {
    invalidOutput(definition, [...path, 'points'], 'straight route must contain exactly two points.', relatedIds);
  }

  if ('cornerRadius' in relation.routing) {
    points.slice(1).forEach((point, index) => {
      const previous = points[index];
      if (point[0] !== previous[0] && point[1] !== previous[1]) {
        invalidOutput(
          definition,
          [...path, 'points', index + 1],
          'orthogonal route segments must be axis-aligned.',
          relatedIds,
        );
      }
    });
  }

  const sourceBounds = boundsById.get(relation.source.id);
  const targetBounds = boundsById.get(relation.target.id);
  if (sourceBounds === undefined || targetBounds === undefined) {
    return invalidOutput(
      definition,
      [...path, 'points'],
      'route references an element without output bounds.',
      relatedIds,
    );
  }

  const source = resolveFlowEndpointPosition(endpoints.source, elements, context);
  const target = resolveFlowEndpointPosition(endpoints.target, elements, context);
  const curve = route.kind === 'bend' || route.kind === 'curve' || route.kind === 'cubic';
  const matches = (
    endpoint: FlowEndpointTarget,
    expected: Readonly<Position>,
    point: Readonly<Position>,
    bounds: Readonly<BoundsRect>,
  ): boolean =>
    endpoint.anchor !== undefined || curve
      ? coincidentFlowEndpoints(expected, point)
      : layoutLessThanOrEqual(bounds.x, point[0]) &&
        layoutLessThanOrEqual(point[0], bounds.x + bounds.width) &&
        layoutLessThanOrEqual(bounds.y, point[1]) &&
        layoutLessThanOrEqual(point[1], bounds.y + bounds.height);
  if (
    !matches(endpoints.source, source, points[0], sourceBounds) ||
    !matches(endpoints.target, target, points.at(-1)!, targetBounds)
  ) {
    invalidOutput(
      definition,
      [...path, 'route', 'points'],
      'route endpoints must match assigned endpoint positions.',
      relatedIds,
    );
  }

  if (
    relation.routing.kind === FlowRoutingKind.HorizontalThenVertical ||
    relation.routing.kind === FlowRoutingKind.VerticalThenHorizontal
  ) {
    const corner: Position =
      relation.routing.kind === FlowRoutingKind.HorizontalThenVertical
        ? [target[0], source[1]]
        : [source[0], target[1]];
    const expected = collapsePoints([[...source], corner, [...target]]);
    if (
      points.length !== expected.length ||
      points.some((point, index) => point[0] !== expected[index][0] || point[1] !== expected[index][1])
    ) {
      invalidOutput(
        definition,
        [...path, 'points'],
        'single-elbow route must connect element centers in the requested axis order.',
        relatedIds,
      );
    }
  }

  if (relation.labelSize === undefined && labelBounds !== undefined) {
    invalidOutput(definition, [...path, 'labelBounds'], 'unlabeled relation must not return label bounds.', relatedIds);
  }

  if (relation.labelSize !== undefined) {
    if (labelBounds === undefined) {
      return invalidOutput(
        definition,
        [...path, 'labelBounds'],
        'labeled relation must return label bounds.',
        relatedIds,
      );
    }

    let expectedSize = relation.labelSize;
    if (relation.labelPlacement?.sloped) {
      try {
        expectedSize = flowRouteLabelBounds(route, relation) ?? expectedSize;
      } catch (cause) {
        return flowBendGeometryFailure(relationIndex, relation, cause);
      }
    }

    if (
      !layoutLessThanOrEqual(labelBounds.width, expectedSize.width) ||
      !layoutLessThanOrEqual(expectedSize.width, labelBounds.width) ||
      !layoutLessThanOrEqual(labelBounds.height, expectedSize.height) ||
      !layoutLessThanOrEqual(expectedSize.height, labelBounds.height)
    ) {
      invalidOutput(definition, [...path, 'labelBounds'], 'label bounds must preserve measured size.', relatedIds);
    }
  }
};

const resolveFlowLayoutOutput = (
  definition: FlowLayoutDefinition,
  input: InputFlowLayoutComputation,
  value: FlowLayoutOutput,
  context: FlowLayoutExecutionContext,
): FlowLayoutOutput => {
  const inputElements = flattenElements(input.elements);
  if (value.elements.length !== inputElements.length) {
    invalidOutput(definition, ['elements'], 'element coverage must exactly match input order.');
  }

  const elements = value.elements.map((elementValue, index) => {
    const path = ['elements', index] as const;
    const expected = inputElements[index];
    if (elementValue.id !== expected.id) {
      return invalidOutput(definition, [...path, 'id'], 'element ids and order must exactly match input.', [
        expected.id,
      ]);
    }

    return { id: expected.id, bounds: resolveBounds(elementValue.bounds, definition, [...path, 'bounds']) };
  });
  const boundsById = new Map(elements.map(element => [element.id, element.bounds]));
  assertElementGeometry(input.elements, boundsById, definition);

  if (value.relations.length !== input.relations.length) {
    invalidOutput(definition, ['relations'], 'relation coverage must exactly match input order.');
  }

  const relations = value.relations.map((relationValue, index) => {
    const path = ['relations', index] as const;
    const expected = input.relations[index];

    const resolveEndpoint = (end: 'source' | 'target'): FlowEndpointTarget => {
      const requested = expected[end];
      const actual = relationValue[end];
      if (actual.anchor !== undefined) {
        const result = AnchorRefSchema.safeParse(actual.anchor);
        if (!result.success)
          return invalidOutput(
            definition,
            [...path, end, 'anchor'],
            'expected a valid resolved anchor.',
            undefined,
            result.error,
          );
      }
      if (actual.id !== requested.id) invalidOutput(definition, [...path, end], 'endpoint id must match input.');
      if (
        requested.anchor !== undefined &&
        (typeof requested.anchor === 'object'
          ? typeof actual.anchor !== 'object' ||
            actual.anchor.side !== requested.anchor.side ||
            actual.anchor.fraction !== requested.anchor.fraction
          : actual.anchor !== requested.anchor)
      )
        invalidOutput(definition, [...path, end], 'explicit anchor must remain fixed.');

      if (requested.side !== undefined && (typeof actual.anchor !== 'object' || actual.anchor.side !== requested.side))
        invalidOutput(definition, [...path, end], 'endpoint must preserve requested side.');
      if (requested.overlap === 'separate' && actual.anchor === undefined)
        invalidOutput(definition, [...path, end], 'separate endpoint must have a resolved anchor.');

      return actual;
    };

    const endpoints = { source: resolveEndpoint('source'), target: resolveEndpoint('target') };
    const resolvedRoute = relationValue.route;
    /** 复用权威标量值域，不重新解析布局回调的整个结构 */
    const assertNumericParameter = (parameter: number, schema: ZodType<number>, key: string): void => {
      const result = schema.safeParse(parameter);
      if (!result.success)
        invalidOutput(
          definition,
          [...path, 'route', key],
          'route parameter is outside its numeric domain.',
          undefined,
          result.error,
        );
    };
    if (resolvedRoute.kind === 'smooth') {
      assertNumericParameter(resolvedRoute.tension, SmoothTensionSchema.unwrap(), 'tension');
      if (resolvedRoute.points.length < 3)
        invalidOutput(definition, [...path, 'route', 'points'], 'smooth route must contain at least three knots.');
    } else if (resolvedRoute.kind === 'bend') {
      if ('outAngle' in resolvedRoute) {
        assertNumericParameter(resolvedRoute.outAngle, BendOutAngleSchema.unwrap(), 'outAngle');
        assertNumericParameter(resolvedRoute.inAngle, BendInAngleSchema.unwrap(), 'inAngle');
        assertNumericParameter(resolvedRoute.looseness, BendLoosenessSchema.unwrap(), 'looseness');
      } else assertNumericParameter(resolvedRoute.bendAngle, BendAngleSchema.unwrap(), 'bendAngle');
    }
    if (
      'cornerRadius' in resolvedRoute &&
      (!Number.isFinite(resolvedRoute.cornerRadius) || resolvedRoute.cornerRadius < 0)
    ) {
      invalidOutput(definition, [...path, 'route', 'cornerRadius'], 'corner radius must be finite and non-negative.');
    }
    const controlPoints =
      resolvedRoute.kind === 'curve'
        ? [resolvedRoute.control]
        : resolvedRoute.kind === 'cubic'
          ? [resolvedRoute.control1, resolvedRoute.control2]
          : [];
    [...resolvedRoute.points, ...controlPoints].forEach((point, pointIndex) => {
      point.forEach((coordinate, axis) =>
        resolveFiniteNumber(coordinate, definition, [...path, 'route', 'points', pointIndex, axis]),
      );
    });
    const roundLayoutPoint = (point: Readonly<Position>): Position => [
      point[0] === 0 ? 0 : point[0],
      point[1] === 0 ? 0 : point[1],
    ];
    const route: FlowLayoutRoute =
      resolvedRoute.kind === 'bend' || resolvedRoute.kind === 'curve' || resolvedRoute.kind === 'cubic'
        ? {
            ...resolvedRoute,
            points: [roundLayoutPoint(resolvedRoute.points[0]), roundLayoutPoint(resolvedRoute.points[1])],
          }
        : {
            ...resolvedRoute,
            points:
              resolvedRoute.kind === 'smooth'
                ? resolvedRoute.points.map(roundLayoutPoint)
                : collapsePoints(resolvedRoute.points.map(roundLayoutPoint)),
          };

    const labelBounds =
      relationValue.labelBounds === undefined
        ? undefined
        : resolveBounds(relationValue.labelBounds, definition, [...path, 'labelBounds']);
    assertRoute(expected, route, labelBounds, boundsById, definition, index, endpoints, elements, context);
    if (
      route.kind === 'orthogonal' &&
      expected.routing.kind === 'orthogonal' &&
      expected.routing.turnPosition !== undefined
    ) {
      const candidates = createFlowOrthogonalCandidates(input, elements, index, endpoints, context);
      if (
        !candidates.some(
          candidate =>
            candidate.points.length === route.points.length &&
            candidate.points.every((point, pointIndex) =>
              point.every((coordinate, axis) => Math.abs(coordinate - route.points[pointIndex][axis]) <= 1e-6),
            ),
        )
      )
        invalidOutput(
          definition,
          [...path, 'route', 'points'],
          'orthogonal points must preserve gap fractions, aligned endpoints and feedback lanes.',
          [expected.source.id, expected.target.id],
        );
    }

    return { ...endpoints, route, ...(labelBounds === undefined ? {} : { labelBounds }) };
  });

  const endpoints = relations.flatMap((relation, index) =>
    (['source', 'target'] as const).map(end => ({
      target: relation[end],
      input: input.relations[index][end],
      index,
      end,
    })),
  );
  endpoints.forEach((endpoint, index) => {
    for (const other of endpoints.slice(0, index)) {
      if (
        endpoint.target.id !== other.target.id ||
        (endpoint.input.overlap !== 'separate' && other.input.overlap !== 'separate')
      )
        continue;

      if (endpoint.target.anchor === undefined || other.target.anchor === undefined)
        invalidOutput(
          definition,
          ['relations', endpoint.index, endpoint.end],
          'separation requires all incident endpoints to be resolved.',
        );

      if (
        coincidentFlowEndpoints(
          resolveFlowEndpointPosition(endpoint.target, elements, context),
          resolveFlowEndpointPosition(other.target, elements, context),
        )
      )
        invalidOutput(
          definition,
          ['relations', endpoint.index, endpoint.end],
          'separate endpoints must not coincide.',
          [endpoint.target.id],
        );
    }
  });

  return { elements, relations };
};

/** 同步调用并验证一个 Flow Layout Definition，返回脱离且深冻结的唯一几何 */
export const executeFlowLayout = (
  definition: FlowLayoutDefinition,
  input: InputFlowLayoutComputation,
  placementContext?: FlowLayoutExecutionContext,
): FlowLayoutOutput => {
  const inputSnapshot = cloneAndFreezeJson(input, `Flow Layout Definition '${definition.name}' input`);
  const layouts = new Map(
    flattenElements(inputSnapshot.elements)
      .filter((element): element is Extract<InputFlowLayoutElement, { kind: 'layout' }> => element.kind === 'layout')
      .map(element => [element.id, element]),
  );
  const placements = new Map<string, PlacementRecord>();

  const executionContext: FlowLayoutExecutionContext = Object.freeze({
    resolveEndpoint: query => {
      if (placementContext === undefined)
        return invalidOutput(definition, ['relations'], 'Endpoint query context is unavailable.');
      return cloneAndFreezeJson(placementContext.resolveEndpoint(cloneAndFreezeJson(query)));
    },
    resolveRoutePoints: query => {
      if (placementContext === undefined)
        return invalidOutput(definition, ['relations'], 'Route point query context is unavailable.');
      return cloneAndFreezeJson(placementContext.resolveRoutePoints(cloneAndFreezeJson(query)));
    },
    placeLayout: value => {
      const layoutId = value.layout.id;
      const expected = layouts.get(layoutId);
      if (expected === undefined) {
        return invalidOutput(definition, ['layouts', layoutId], 'placeLayout referenced an unknown Layout.', [
          layoutId,
        ]);
      }

      if (placements.has(layoutId)) {
        return invalidOutput(
          definition,
          ['layouts', layoutId],
          'each authored Layout must call placeLayout exactly once.',
          [layoutId],
        );
      }

      assertPlacementInput(definition, expected, value);
      if (placementContext === undefined) {
        return invalidOutput(definition, ['layouts', layoutId], 'Layout placement context is unavailable.', [layoutId]);
      }

      const placementInput = cloneAndFreezeJson(value, `Flow Layout '${layoutId}' placement input`);
      const placementOutput = resolvePlacementOutput(
        definition,
        placementInput,
        cloneAndFreezeJson(placementContext.placeLayout(placementInput), `Flow Layout '${layoutId}' placement output`),
      );
      const record = cloneAndFreezeJson({ input: placementInput, output: placementOutput });
      placements.set(layoutId, record);

      return record.output;
    },
  });

  let callbackOutput: FlowLayoutOutput;

  try {
    callbackOutput = definition.layout(inputSnapshot, executionContext);
  } catch (cause) {
    if (
      cause instanceof RetikzDiagramError &&
      (cause.code === RetikzDiagramErrorCode.FlowLayoutOutputInvalid ||
        cause.code === RetikzDiagramErrorCode.FlowMaterializationFailed ||
        cause.code === RetikzDiagramErrorCode.FlowBezierRouteUnavailable ||
        cause.code === RetikzDiagramErrorCode.FlowConstraintUnsatisfiable)
    )
      throw cause;

    return callbackFailed(definition, 'layout callback threw.', cause);
  }

  let detachedOutput: FlowLayoutOutput;

  try {
    detachedOutput = cloneAndFreezeJson(callbackOutput, `Flow Layout Definition '${definition.name}' output`);
  } catch (cause) {
    return invalidOutput(definition, [], 'output must contain only JSON-safe plain data.', undefined, cause);
  }

  const output = cloneAndFreezeJson(
    resolveFlowLayoutOutput(definition, inputSnapshot, detachedOutput, executionContext),
  );
  assertRecordedPlacements(definition, inputSnapshot, output, placements);

  for (const [index, relation] of inputSnapshot.relations.entries()) {
    if (relation.routing.kind !== 'smooth') continue;

    const route = output.relations[index].route;
    const expected = executionContext.resolveRoutePoints({
      elements: output.elements,
      source: output.relations[index].source,
      target: output.relations[index].target,
      points: relation.routing.points,
    });
    if (
      route.kind !== 'smooth' ||
      route.tension !== relation.routing.tension ||
      route.points.length !== expected.length ||
      route.points.some(
        (point, pointIndex) => point[0] !== expected[pointIndex][0] || point[1] !== expected[pointIndex][1],
      )
    ) {
      invalidOutput(
        definition,
        ['relations', index, 'route'],
        'smooth route must preserve all resolved knots, order and tension.',
        [relation.source.id, relation.target.id],
      );
    }
  }

  return output;
};
