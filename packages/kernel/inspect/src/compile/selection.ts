import type { CompileResult, CompositeArtifact, ScenePrimitive, Transform } from '@retikz/core';
import type { JsonObject } from '@retikz/foundation';
import { AFFINE_IDENTITY, multiplyAffine } from '@retikz/math';
import type { AffineMatrix } from '@retikz/math';

import type { AnyInspectorDefinition, InspectionTarget, InspectorSubject } from '../contract';
import { RetikzInspectError, RetikzInspectErrorCode } from '../error';
import type { InspectorRegistry } from '../providers';
import { getResolvedInspectorRegistry } from '../providers';
import { wrapInspectionError } from './diagnostics';
import type { InspectionRequest } from './types';

/** 当前快照中的实际对象及其空间事实 */
type InspectionSite =
  | { target: Extract<InspectionTarget, { kind: 'primitive' }>; value: ScenePrimitive; transform: AffineMatrix }
  | { target: Extract<InspectionTarget, { kind: 'artifact' }>; value: CompositeArtifact; transform?: never };

/** 已解析选项、唯一目标和定义的执行请求 */
export type PreparedInspectionRequest = {
  definition: AnyInspectorDefinition;
  site: InspectionSite;
  options: JsonObject;
  requestIndex: number;
};

/** Scene transform 按公开 SVG 矩阵组合语义转换 */
const matrixOf = (transforms: ReadonlyArray<Transform> = []): AffineMatrix => {
  let matrix = AFFINE_IDENTITY;
  for (const transform of transforms) {
    let next: AffineMatrix;
    if (transform.kind === 'translate') next = [1, 0, 0, 1, transform.x, transform.y];
    else if (transform.kind === 'scale') next = [transform.x, 0, 0, transform.y ?? transform.x, 0, 0];
    else {
      const angle = (transform.degrees * Math.PI) / 180;
      const c = Math.cos(angle),
        s = Math.sin(angle);
      const x = transform.cx ?? 0,
        y = transform.cy ?? 0;
      next = [c, s, -s, c, x - c * x + s * y, y - s * x - c * y];
    }
    matrix = multiplyAffine(matrix, next);
  }
  return matrix;
};

/** 匹配图元种类或领域注册键，不解释领域值 */
const matches = (site: InspectionSite, subject: InspectorSubject): boolean => {
  if (site.target.kind === 'primitive' && subject.kind === 'primitive') return site.value.type === subject.type;
  if (site.target.kind === 'artifact' && subject.kind === 'artifact') {
    const artifact = site.value as CompositeArtifact;
    return artifact.namespace === subject.namespace && artifact.type === subject.type;
  }
  return false;
};

/** 按判别字段与索引比较当前快照目标 */
const sameTarget = (left: InspectionTarget, right: InspectionTarget): boolean => {
  if (left.kind === 'artifact') return right.kind === 'artifact' && left.index === right.index;
  return (
    right.kind === 'primitive' &&
    left.path.length === right.path.length &&
    left.path.every((index, depth) => index === right.path[depth])
  );
};

/** 选择当前快照对象；先校验全部请求，避免部分回调已执行后才发现重复 */
export const prepareInspectionRequests = (
  result: CompileResult,
  registry: InspectorRegistry,
  requests: ReadonlyArray<InspectionRequest>,
): Array<PreparedInspectionRequest> => {
  const sites: Array<InspectionSite> = [];
  const visit = (primitive: ScenePrimitive, path: Array<number>, inherited: AffineMatrix): void => {
    const transform =
      primitive.type === 'group' ? multiplyAffine(inherited, matrixOf(primitive.transforms)) : inherited;
    sites.push({ target: { kind: 'primitive', path }, value: primitive, transform });
    if (primitive.type === 'group')
      primitive.children.forEach((child, index) => visit(child, [...path, index], transform));
  };
  result.scene.primitives.forEach((primitive, index) => visit(primitive, [index], AFFINE_IDENTITY));
  result.artifacts.forEach((artifact, index) => sites.push({ target: { kind: 'artifact', index }, value: artifact }));
  const seen = new Set<string>();
  const prepared: Array<PreparedInspectionRequest> = [];
  requests.forEach((request, requestIndex) => {
    try {
      const definition = getResolvedInspectorRegistry(registry).require(request.inspector);
      const options = definition.optionsSchema.parse(request.options ?? {});
      const target = request.target;
      const selected =
        target === undefined
          ? sites.filter(site => matches(site, definition.subject))
          : sites.filter(site => sameTarget(site.target, target));
      if (request.target !== undefined && (selected.length !== 1 || !matches(selected[0], definition.subject))) {
        throw new RetikzInspectError(
          RetikzInspectErrorCode.Compile,
          'Inspection target is missing or does not match the subject',
        );
      }
      for (const site of selected) {
        const key = JSON.stringify([definition.namespace, definition.type, site.target]);
        if (seen.has(key))
          throw new RetikzInspectError(
            RetikzInspectErrorCode.Compile,
            'Duplicate Inspector request for the same target',
          );
        seen.add(key);
        prepared.push({ definition, site, options, requestIndex });
      }
    } catch (cause) {
      throw wrapInspectionError(
        { stage: 'selection', requestIndex, inspector: request.inspector, target: request.target },
        cause,
      );
    }
  });
  return prepared;
};
