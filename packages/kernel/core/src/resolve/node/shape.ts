import type { PropertyPath } from '@retikz/foundation';
import type { JsonObject, JsonValue } from '@retikz/foundation';

import type { ShapeDefinition } from '../../contract';
import { RetikzCoreError, RetikzCoreErrorCode } from '../../error';
import type { ProviderRegistry } from '../../providers';
import { getProviderDefinition } from '../../providers';
import type { IRNode, IRShapeRef } from '../../schemas';
import { BuiltinShape } from '../../schemas';
import { parseProviderPayload, withProviderOutputValidationBoundary } from '../provider';
import type { ShapeResolution } from './types';

/** 节点形状解析所需的输入与缩放参数 */
type InputNodeShapeResolve = {
  /** 待解析节点 */
  node: Pick<IRNode, 'shape' | 'cornerRadius'>;
  /** 形状定义注册表 */
  shapeRegistry: ProviderRegistry<ShapeDefinition>;
  /** x 轴缩放 */
  scaleX: number;
  /** y 轴缩放 */
  scaleY: number;
  /** 当前节点的 IR 路径，用于形状参数校验错误定位 */
  irPath?: PropertyPath;
};

/** 形状简写展开后的定义名称与参数 */
type NodeShapePresetResolution = {
  /** 实际查询的形状定义名称 */
  type: string;
  /** 交给形状定义解析的 JSON 参数对象 */
  params: JsonObject;
};

/** 将节点形状简写展开为定义名称与参数，缺省形状为矩形 */
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

/**
 * 查找节点形状定义，解析参数并应用节点缩放
 * @description 优先使用定义提供的 scaleParams；未提供时，将参数中的所有数值乘以两轴缩放系数的几何平均值
 */
export const resolveNodeShape = (input: InputNodeShapeResolve): ShapeResolution => {
  const { node, shapeRegistry, scaleX, scaleY, irPath = [] } = input;
  const { type: shapeName, params: rawShapeParams } = resolveNodeShapePreset(node.shape);
  const shapeParamsPath = [...irPath, 'shape', 'params'];
  const shapeDefinition = getProviderDefinition(shapeRegistry, shapeName);
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
