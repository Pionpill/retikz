import type { BoundsInsets, BoundsRect, Position } from '@retikz/math';

import { cloneAndFreezeJson } from '@retikz/foundation';

import type {
  FlowLayoutDefinition,
  FlowLayoutElementInput,
  FlowLayoutExecutionContext,
  FlowLayoutInput,
  FlowLayoutOutput,
  FlowLayoutPlacementInput,
  FlowLayoutPlacementOutput,
  FlowLayoutRelationInput,
} from '../../contract';

import { RetikzDiagramError, RetikzDiagramErrorCode } from '../../../errors';

type PlainRecord = Readonly<Record<string, unknown>>;

const isPlainRecord = (value: unknown): value is PlainRecord =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const hasExactKeys = (
  value: PlainRecord,
  required: ReadonlyArray<string>,
  optional: ReadonlyArray<string> = [],
): boolean => {
  const keys = Object.keys(value);
  return (
    required.every(key => keys.includes(key)) && keys.every(key => required.includes(key) || optional.includes(key))
  );
};

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

const parseFiniteNumber = (
  value: unknown,
  definition: FlowLayoutDefinition,
  path: ReadonlyArray<string | number>,
): number => {
  if (typeof value !== 'number') return invalidOutput(definition, path, 'expected a finite number.');
  if (!Number.isFinite(value)) return invalidOutput(definition, path, 'expected a finite number.');
  return value;
};

const parseBounds = (
  value: unknown,
  definition: FlowLayoutDefinition,
  path: ReadonlyArray<string | number>,
): Readonly<BoundsRect> => {
  if (!isPlainRecord(value) || !hasExactKeys(value, ['x', 'y', 'width', 'height'])) {
    return invalidOutput(definition, path, 'expected a closed bounds record.');
  }
  const bounds = {
    x: parseFiniteNumber(value.x, definition, [...path, 'x']),
    y: parseFiniteNumber(value.y, definition, [...path, 'y']),
    width: parseFiniteNumber(value.width, definition, [...path, 'width']),
    height: parseFiniteNumber(value.height, definition, [...path, 'height']),
  };
  if (bounds.width < 0 || bounds.height < 0) invalidOutput(definition, path, 'bounds size must be non-negative.');
  return bounds;
};

const parsePosition = (
  value: unknown,
  definition: FlowLayoutDefinition,
  path: ReadonlyArray<string | number>,
): Position => {
  if (!Array.isArray(value) || value.length !== 2)
    return invalidOutput(definition, path, 'expected a two-dimensional point.');
  const x = parseFiniteNumber(value[0], definition, [...path, 0]);
  const y = parseFiniteNumber(value[1], definition, [...path, 1]);
  return [Object.is(x, -0) ? 0 : x, Object.is(y, -0) ? 0 : y];
};

const collapsePoints = (points: ReadonlyArray<Position>): ReadonlyArray<Position> =>
  points.filter(
    (point, index) => index === 0 || point[0] !== points[index - 1]?.[0] || point[1] !== points[index - 1]?.[1],
  );

const flattenElements = (elements: ReadonlyArray<FlowLayoutElementInput>): ReadonlyArray<FlowLayoutElementInput> =>
  elements.flatMap(element => [element, ...(element.kind === 'leaf' ? [] : flattenElements(element.elements))]);

const containsPoint = (bounds: Readonly<BoundsRect>, point: Position): boolean =>
  point[0] >= bounds.x &&
  point[0] <= bounds.x + bounds.width &&
  point[1] >= bounds.y &&
  point[1] <= bounds.y + bounds.height;

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

const validateElementGeometry = (
  elements: ReadonlyArray<FlowLayoutElementInput>,
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
    for (const child of element.elements) {
      const childBounds = boundsById.get(child.id);
      if (childBounds === undefined || !containsBounds(contentBounds, childBounds)) {
        invalidOutput(definition, ['elements'], 'Flow scope content bounds must contain every direct child.', [
          element.id,
          child.id,
        ]);
      }
    }
  }

  const visitScope = (scopeElements: ReadonlyArray<FlowLayoutElementInput>): void => {
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
  input: FlowLayoutPlacementInput;
  output: FlowLayoutPlacementOutput;
}>;

const validatePlacementInput = (
  definition: FlowLayoutDefinition,
  expected: Extract<FlowLayoutElementInput, { kind: 'layout' }>,
  input: FlowLayoutPlacementInput,
): void => {
  if (
    !isPlainRecord(input) ||
    !hasExactKeys(input, ['layout', 'elements']) ||
    !isPlainRecord(input.layout) ||
    !hasExactKeys(input.layout, ['id', 'direction', 'gap', 'align']) ||
    !Array.isArray(input.elements)
  ) {
    return invalidOutput(definition, ['layouts', expected.id], 'expected a closed Layout placement input.');
  }
  if (
    input.layout.id !== expected.id ||
    input.layout.direction !== expected.layout.direction ||
    input.layout.gap !== expected.layout.nodeGap ||
    input.layout.align !== expected.align
  ) {
    invalidOutput(definition, ['layouts', expected.id, 'layout'], 'Layout placement configuration must match input.', [
      expected.id,
    ]);
  }
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

const normalizePlacementOutput = (
  definition: FlowLayoutDefinition,
  input: FlowLayoutPlacementInput,
  value: unknown,
): FlowLayoutPlacementOutput => {
  const path = ['layouts', input.layout.id] as const;
  if (!isPlainRecord(value) || !hasExactKeys(value, ['bounds', 'elements']) || !Array.isArray(value.elements)) {
    return invalidOutput(definition, path, 'expected a closed Layout placement output.', [input.layout.id]);
  }
  if (value.elements.length !== input.elements.length) {
    invalidOutput(definition, [...path, 'elements'], 'Layout placement coverage must match direct children.', [
      input.layout.id,
    ]);
  }
  const elements = value.elements.map((element, index) => {
    const elementPath = [...path, 'elements', index] as const;
    const expected = input.elements[index];
    if (!isPlainRecord(element) || !hasExactKeys(element, ['id', 'bounds']) || element.id !== expected.id) {
      return invalidOutput(definition, elementPath, 'Layout placement child ids and order must match input.', [
        expected.id,
      ]);
    }
    const bounds = parseBounds(element.bounds, definition, [...elementPath, 'bounds']);
    if (bounds.width !== expected.size.width || bounds.height !== expected.size.height) {
      invalidOutput(definition, [...elementPath, 'bounds'], 'Layout placement must preserve measured child size.', [
        expected.id,
      ]);
    }
    return { id: expected.id, bounds };
  });
  return { bounds: parseBounds(value.bounds, definition, [...path, 'bounds']), elements };
};

const validateRecordedPlacements = (
  definition: FlowLayoutDefinition,
  input: FlowLayoutInput,
  output: FlowLayoutOutput,
  records: ReadonlyMap<string, PlacementRecord>,
): void => {
  const boundsById = new Map(output.elements.map(element => [element.id, element.bounds]));
  for (const layout of flattenElements(input.elements).filter(
    (element): element is Extract<FlowLayoutElementInput, { kind: 'layout' }> => element.kind === 'layout',
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

const validateRoute = (
  relation: FlowLayoutRelationInput,
  points: ReadonlyArray<Position>,
  labelBounds: Readonly<BoundsRect> | undefined,
  boundsById: ReadonlyMap<string, Readonly<BoundsRect>>,
  definition: FlowLayoutDefinition,
  relationIndex: number,
): void => {
  const path = ['relations', relationIndex] as const;
  const relatedIds = [relation.source, relation.target];
  if (points.length < 2)
    invalidOutput(definition, [...path, 'points'], 'route must contain at least two distinct points.', relatedIds);
  if (relation.routing.kind === 'straight' && points.length !== 2) {
    invalidOutput(definition, [...path, 'points'], 'straight route must contain exactly two points.', relatedIds);
  }
  if (relation.routing.kind === 'orthogonal') {
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
  const sourceBounds = boundsById.get(relation.source);
  const targetBounds = boundsById.get(relation.target);
  if (sourceBounds === undefined || targetBounds === undefined) {
    return invalidOutput(
      definition,
      [...path, 'points'],
      'route references an element without output bounds.',
      relatedIds,
    );
  }
  if (!containsPoint(sourceBounds, points[0]) || !containsPoint(targetBounds, points.at(-1)!)) {
    invalidOutput(definition, [...path, 'points'], 'route endpoints must lie inside their element bounds.', relatedIds);
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
    if (labelBounds.width !== relation.labelSize.width || labelBounds.height !== relation.labelSize.height) {
      invalidOutput(definition, [...path, 'labelBounds'], 'label bounds must preserve measured size.', relatedIds);
    }
  }
};

const normalizeAndValidateOutput = (
  definition: FlowLayoutDefinition,
  input: FlowLayoutInput,
  value: unknown,
): FlowLayoutOutput => {
  if (!isPlainRecord(value) || !hasExactKeys(value, ['elements', 'relations'])) {
    return invalidOutput(definition, [], 'expected a closed output record.');
  }
  if (!Array.isArray(value.elements) || !Array.isArray(value.relations)) {
    return invalidOutput(definition, [], 'elements and relations must be arrays.');
  }
  const inputElements = flattenElements(input.elements);
  if (value.elements.length !== inputElements.length) {
    invalidOutput(definition, ['elements'], 'element coverage must exactly match input order.');
  }
  const elements = value.elements.map((elementValue, index) => {
    const path = ['elements', index] as const;
    if (!isPlainRecord(elementValue) || !hasExactKeys(elementValue, ['id', 'bounds'])) {
      return invalidOutput(definition, path, 'expected a closed element output record.');
    }
    const expected = inputElements[index];
    if (elementValue.id !== expected.id) {
      return invalidOutput(definition, [...path, 'id'], 'element ids and order must exactly match input.', [
        expected.id,
      ]);
    }
    return { id: expected.id, bounds: parseBounds(elementValue.bounds, definition, [...path, 'bounds']) };
  });
  const boundsById = new Map(elements.map(element => [element.id, element.bounds]));
  validateElementGeometry(input.elements, boundsById, definition);

  if (value.relations.length !== input.relations.length) {
    invalidOutput(definition, ['relations'], 'relation coverage must exactly match input order.');
  }
  const relations = value.relations.map((relationValue, index) => {
    const path = ['relations', index] as const;
    if (!isPlainRecord(relationValue) || !hasExactKeys(relationValue, ['points'], ['labelBounds'])) {
      return invalidOutput(definition, path, 'expected a closed relation output record.');
    }
    const expected = input.relations[index];
    if (!Array.isArray(relationValue.points)) {
      return invalidOutput(definition, [...path, 'points'], 'relation points must be an array.', [
        expected.source,
        expected.target,
      ]);
    }
    const points = collapsePoints(
      relationValue.points.map((point, pointIndex) =>
        parsePosition(point, definition, [...path, 'points', pointIndex]),
      ),
    );
    const labelBounds =
      relationValue.labelBounds === undefined
        ? undefined
        : parseBounds(relationValue.labelBounds, definition, [...path, 'labelBounds']);
    validateRoute(expected, points, labelBounds, boundsById, definition, index);
    return { points, ...(labelBounds === undefined ? {} : { labelBounds }) };
  });
  return { elements, relations };
};

/** 同步调用并验证一个 Flow Layout Definition，返回脱离且深冻结的唯一几何 */
export const executeFlowLayout = (
  definition: FlowLayoutDefinition,
  input: FlowLayoutInput,
  placementContext?: FlowLayoutExecutionContext,
): FlowLayoutOutput => {
  const inputSnapshot = cloneAndFreezeJson(input, `Flow Layout Definition '${definition.name}' input`);
  const layouts = new Map(
    flattenElements(inputSnapshot.elements)
      .filter((element): element is Extract<FlowLayoutElementInput, { kind: 'layout' }> => element.kind === 'layout')
      .map(element => [element.id, element]),
  );
  const placements = new Map<string, PlacementRecord>();
  const executionContext: FlowLayoutExecutionContext = Object.freeze({
    placeLayout: value => {
      if (!isPlainRecord(value) || !isPlainRecord(value.layout) || typeof value.layout.id !== 'string') {
        return invalidOutput(definition, ['layouts'], 'expected a closed Layout placement input.');
      }
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
      validatePlacementInput(definition, expected, value);
      if (placementContext === undefined) {
        return invalidOutput(definition, ['layouts', layoutId], 'Layout placement context is unavailable.', [layoutId]);
      }
      const placementInput = cloneAndFreezeJson(value, `Flow Layout '${layoutId}' placement input`);
      const placementOutput = normalizePlacementOutput(
        definition,
        placementInput,
        cloneAndFreezeJson(placementContext.placeLayout(placementInput), `Flow Layout '${layoutId}' placement output`),
      );
      const record = cloneAndFreezeJson({ input: placementInput, output: placementOutput });
      placements.set(layoutId, record);
      return record.output;
    },
  });
  let callbackOutput: unknown;
  try {
    callbackOutput = definition.layout(inputSnapshot, executionContext);
  } catch (cause) {
    if (cause instanceof RetikzDiagramError && cause.code === RetikzDiagramErrorCode.FlowLayoutOutputInvalid)
      throw cause;
    return callbackFailed(definition, 'layout callback threw.', cause);
  }
  if (
    callbackOutput !== null &&
    (typeof callbackOutput === 'object' || typeof callbackOutput === 'function') &&
    'then' in callbackOutput &&
    typeof callbackOutput.then === 'function'
  ) {
    return callbackFailed(definition, 'layout callback must return synchronously.');
  }
  let detachedOutput: unknown;
  try {
    detachedOutput = cloneAndFreezeJson(callbackOutput, `Flow Layout Definition '${definition.name}' output`);
  } catch (cause) {
    return invalidOutput(definition, [], 'output must contain only JSON-safe plain data.', undefined, cause);
  }
  const output = cloneAndFreezeJson(normalizeAndValidateOutput(definition, inputSnapshot, detachedOutput));
  validateRecordedPlacements(definition, inputSnapshot, output, placements);
  return output;
};
