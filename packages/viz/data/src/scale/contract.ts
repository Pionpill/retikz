import type { JsonObject } from '@retikz/foundation';
import type { ZodType } from 'zod';

import type { DataFieldType, IRDataScalarValue } from '../model';
import type { IRDataScaleOperation } from './schema';

/** 通用映射的输出标量 */
export type ScaleValue = number | string;

/** 独立重建数值映射时替换的数学配置 */
export type ScaleRebuildOptions = {
  /** 替换输入域，省略时保留当前域 */
  domain?: readonly [number, number];
  /** 替换输出范围，省略时保留当前范围 */
  range?: readonly [number, number];
  /** 替换钳位设置，省略时保留当前设置 */
  clamp?: boolean;
};

/** 解析后的纯数学映射；不持有名称、图元、图例或布局状态 */
export type ScaleResolution = {
  /** 输入标量到输出值；缺值返回 undefined */
  map: (value: IRDataScalarValue) => ScaleValue | undefined;
  /** 实际使用的输入域 */
  domain: ReadonlyArray<IRDataScalarValue>;
  /** 实际输出范围 */
  range: ReadonlyArray<ScaleValue>;
  /** 算法生成的代表性输入值；不包含标签或坐标轴语义 */
  ticks?: (count?: number) => ReadonlyArray<number>;
  /** 数值输出的反向映射；超出算法合法输入域时返回 undefined */
  invert?: (value: number) => number | undefined;
  /** 使用替换配置创建独立映射，不修改当前映射 */
  rebuild?: (options: ScaleRebuildOptions) => ScaleResolution;
  /** 分类区间的宽度，仅区间映射提供 */
  bandwidth?: number;
  /** 相邻分类位置的间隔 */
  step?: number;
  /** 分档映射的内部边界；无有效样本时省略 */
  thresholds?: ReadonlyArray<number>;
};

/** 数学解析所需的输入与资源，默认选择由宿主完成 */
export type ScaleResolveContext = {
  /** 参与映射训练的样本，保留真实重复观测 */
  values: ReadonlyArray<IRDataScalarValue>;
  /** 显式域优先于样本推断 */
  domain?: IRDataScaleOperation['domain'];
  /** 显式范围 */
  range?: IRDataScaleOperation['range'];
  /** 宿主选定的缺省范围 */
  defaultRange?: IRDataScaleOperation['range'];
  /** 命名字符串插值器；不携带主题对象 */
  interpolators?: ReadonlyMap<string, (fraction: number) => string>;
};

/**
 * 内置与自定义映射共同实现的定义
 * @template TParams 实例参数的 JSON 对象类型
 */
export type InputScaleDefinition<TParams extends JsonObject> = {
  /** 映射唯一注册类型 */
  type: string;
  /** 专有参数的外部解析契约 */
  paramsSchema: ZodType<TParams, TParams>;
  /** 判断声明的字段语义是否兼容 */
  isFieldCompatible: (fieldType: DataFieldType | undefined) => boolean;
  /** 根据公共输入和实例参数构建独立映射 */
  resolve: (context: ScaleResolveContext, params: TParams) => ScaleResolution;
};

/** 异构映射注册项，定义时通过 defineScale 保留参数关联 */
export type ScaleDefinition = InputScaleDefinition<JsonObject>;

/**
 * 定义映射，不注册或解析实例参数
 * @template TParams 实例参数的 JSON 对象类型
 */
export const defineScale = <TParams extends JsonObject>(definition: InputScaleDefinition<TParams>): ScaleDefinition =>
  definition as unknown as ScaleDefinition;
