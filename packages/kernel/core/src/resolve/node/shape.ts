import type { JsonObject, JsonValue } from '@retikz/foundation';

import type { ShapeDefinition } from '../../contract';
import type { ProviderCollection } from '../../providers/registry';
import type { IRNode, IRShapeRef } from '../../schemas';
import type { ShapeResolution } from './types';

import { RetikzCoreError, RetikzCoreErrorCode } from '../../error';
import { providerDefinitionOf } from '../../providers/registry';
import { BuiltinShape } from '../../schemas';
import { parseProviderPayload } from '../provider-payload';
import { withProviderOutputValidationBoundary } from '../provider-validation';

/** 节点 shape 解析输入 */
export type NodeShapeResolveInput = {
  /** 待解析节点 */
  node: IRNode;
  /** shape 注册表 */
  shapes: ProviderCollection<ShapeDefinition>;
  /** x 轴缩放 */
  scaleX: number;
  /** y 轴缩放 */
  scaleY: number;
  /** 当前 node 的 IR 路径，用于 provider payload 诊断 */
  irPath?: string;
};

/** Node shape preset 解析后的 provider 查询形态 */
type NodeShapePresetResolution = {
  /** 实际查询的 shape provider 名称 */
  type: string;
  /** 传给 provider 的 JSON-safe 参数对象 */
  params: JsonObject;
};

/** 将 Node shape preset 展开为实际 provider 名称和参数 */
const resolveNodeShapePreset = (shape: IRNode['shape']): NodeShapePresetResolution => {
  if (shape === undefined) return { type: BuiltinShape.Rectangle, params: {} };
  if (shape === BuiltinShape.Circle) return { type: BuiltinShape.Ellipse, params: { circumscribe: 'equal' } };
  if (shape === BuiltinShape.Diamond) return { type: 'polygon', params: { sides: 4, rotate: 0 } };
  if (typeof shape === 'string') return { type: shape, params: {} };
  const ref: IRShapeRef = shape;
  if (ref.type === BuiltinShape.Diamond) {
    const rawParams = ref.params ?? {};
    const unsupported = Object.keys(rawParams).filter(key => key !== 'aspectRatio');
    if (unsupported.length > 0) {
      throw new RetikzCoreError(
        RetikzCoreErrorCode.Resolve,
        `Diamond shape only accepts aspectRatio; received ${unsupported.join(', ')}`,
      );
    }
    return { type: 'polygon', params: { sides: 4, rotate: 0, ...rawParams } };
  }
  return { type: ref.type, params: ref.params ?? {} };
};

/** 递归将 JSON 值里的数值叶子乘以 factor */
const scaleJsonNumbers = (value: JsonValue, factor: number): JsonValue => {
  if (typeof value === 'number') return value * factor;
  if (Array.isArray(value)) return value.map(childValue => scaleJsonNumbers(childValue, factor));
  if (value !== null && typeof value === 'object') {
    const out: Record<string, JsonValue> = {};
    for (const [key, childValue] of Object.entries(value)) out[key] = scaleJsonNumbers(childValue, factor);
    return out;
  }
  return value;
};

/** 递归缩放 JSON 对象中的数值叶子 */
const scaleJsonObjectNumbers = (value: JsonObject, factor: number): JsonObject =>
  Object.fromEntries(Object.entries(value).map(([key, childValue]) => [key, scaleJsonNumbers(childValue, factor)]));

/** 解析节点 shape definition 与随节点缩放后的 params */
export const resolveNodeShape = (input: NodeShapeResolveInput): ShapeResolution => {
  const { node, shapes, scaleX, scaleY, irPath = 'node' } = input;
  const { type: shapeName, params: rawShapeParams } = resolveNodeShapePreset(node.shape);
  const shapeParamsPath = `${irPath}.shape.params`;
  const shapeDefinition = providerDefinitionOf(shapes, shapeName, { capability: 'shape', optionName: 'shapes' });
  const parsedShapeParams: JsonObject = parseProviderPayload({
    capability: 'shape',
    providerName: shapeName,
    irPath: shapeParamsPath,
    payloadName: 'params',
    schema: shapeDefinition.paramsSchema,
    value: rawShapeParams,
  });
  const mergedShapeParams: JsonObject =
    shapeName === 'rectangle' && node.cornerRadius !== undefined && !('cornerRadius' in parsedShapeParams)
      ? { ...parsedShapeParams, cornerRadius: node.cornerRadius }
      : parsedShapeParams;

  const shapeScale = Math.sqrt(scaleX * scaleY);
  const noScale = scaleX === 1 && scaleY === 1;
  let shapeParams: JsonObject;
  if (noScale) {
    shapeParams = mergedShapeParams;
  } else if (shapeDefinition.scaleParams === undefined) {
    shapeParams = scaleJsonObjectNumbers(mergedShapeParams, shapeScale);
  } else {
    const rawScaledParams = shapeDefinition.scaleParams(mergedShapeParams, scaleX, scaleY);
    shapeParams = withProviderOutputValidationBoundary(`Shape '${shapeName}' scaleParams`, () =>
      shapeDefinition.paramsSchema.parse(rawScaledParams),
    );
  }

  return { name: shapeName, definition: shapeDefinition, params: shapeParams };
};
