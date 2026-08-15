import type { ShapeDefinition } from '../../contract';
import type { ProviderCollection } from '../../providers/registry';
import type { IRJsonObject, IRNode, IRShapeRef, JsonValue } from '../../schemas';

import { providerDefinitionOf } from '../../providers/registry';
import { BuiltinShape, JsonObjectSchema } from '../../schemas';
import { parseProviderPayload } from '../provider-payload';
import { withProviderOutputValidationBoundary } from '../provider-validation';
import type { ShapeResolution } from './types';

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
  params: IRJsonObject;
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
      throw new Error(`Diamond shape only accepts aspectRatio; received ${unsupported.join(', ')}`);
    }
    return { type: 'polygon', params: { sides: 4, rotate: 0, ...rawParams } };
  }
  return { type: ref.type, params: ref.params ?? {} };
};

/** 递归将 JSON 值里的数值叶子乘以 factor */
const scaleJsonNumbers = <T extends JsonValue>(value: T, factor: number): T => {
  if (typeof value === 'number') return (value * factor) as T;
  if (Array.isArray(value)) return value.map(v => scaleJsonNumbers(v, factor)) as T;
  if (value !== null && typeof value === 'object') {
    const out: Record<string, JsonValue> = {};
    for (const [key, childValue] of Object.entries(value)) out[key] = scaleJsonNumbers(childValue, factor);
    return out as T;
  }
  return value;
};

/** 解析节点 shape definition 与随节点缩放后的 params */
export const resolveNodeShape = (input: NodeShapeResolveInput): ShapeResolution => {
  const { node, shapes, scaleX, scaleY, irPath = 'node' } = input;
  const { type: shapeName, params: rawShapeParams } = resolveNodeShapePreset(node.shape);
  const shapeParamsPath = `${irPath}.shape.params`;
  const shapeDefinition = providerDefinitionOf(shapes, shapeName, { capability: 'shape', optionName: 'shapes' });
  parseProviderPayload({
    capability: 'shape',
    providerName: shapeName,
    irPath: shapeParamsPath,
    payloadName: 'params',
    schema: JsonObjectSchema,
    value: rawShapeParams,
  });
  const parsedShapeParams: IRJsonObject = parseProviderPayload({
    capability: 'shape',
    providerName: shapeName,
    irPath: shapeParamsPath,
    payloadName: 'params',
    schema: shapeDefinition.paramsSchema,
    value: rawShapeParams,
  });
  const mergedShapeParams: IRJsonObject =
    shapeName === 'rectangle' && node.cornerRadius !== undefined && !('cornerRadius' in parsedShapeParams)
      ? { ...parsedShapeParams, cornerRadius: node.cornerRadius }
      : parsedShapeParams;

  const shapeScale = Math.sqrt(scaleX * scaleY);
  const noScale = scaleX === 1 && scaleY === 1;
  let shapeParams: IRJsonObject;
  if (noScale) {
    shapeParams = mergedShapeParams;
  } else if (shapeDefinition.scaleParams === undefined) {
    shapeParams = scaleJsonNumbers(mergedShapeParams, shapeScale);
  } else {
    const rawScaledParams = shapeDefinition.scaleParams(mergedShapeParams, scaleX, scaleY);
    shapeParams = withProviderOutputValidationBoundary(`Shape '${shapeName}' scaleParams`, () => {
      const parsedScaledParams = shapeDefinition.paramsSchema.parse(rawScaledParams);
      return JsonObjectSchema.parse(parsedScaledParams);
    });
  }

  return { name: shapeName, definition: shapeDefinition, params: shapeParams };
};
