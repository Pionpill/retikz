import type { Position } from '@retikz/math';
import type { z } from 'zod';

import type { IRJsonObject } from '../../schemas';
import type { AnchorValue, Rect } from '../../shared';
import type { ConnectionEnvelopeKind } from '../shape';

/**
 * 连接面命名 anchor 的名字
 * @description 包含标准 anchor 名，也允许 boundary 自定义额外名字
 */
export type BoundaryAnchorName = AnchorValue | (string & {});

/** Boundary provider 解析实例连接矩形时可用的视觉几何上下文 */
export type BoundaryFitContext = {
  /** 节点视觉 shape 的外接矩形 */
  visualRect: Rect;
  /** 获取视觉 shape 对指定规则连接面的安全包络 */
  connectionEnvelope: (kind: ConnectionEnvelopeKind) => Rect;
};

/** boundary definition 的作者侧输入形态 */
export type BoundaryDefinitionInput<TParams extends IRJsonObject> = {
  /** 注册表 key，由 IR `boundary` 引用 */
  name: string;
  /** 运行时连接面参数的 schema */
  paramsSchema: z.ZodType<TParams>;
  /**
   * 根据视觉 shape 和实例 params 解析本连接面使用的矩形
   * @default 直接使用视觉 rect
   */
  resolveRect?: (context: BoundaryFitContext, params: TParams) => Rect;
  /** 从中心指向 toward 的射线与连接面的交点 */
  boundaryPoint: (rect: Rect, toward: Position, params: TParams) => Position;
  /**
   * 可选的命名 anchor 支持，用于标准连接点或自定义连接点
   * @default 不支持；调用方回退或报告不支持该 anchor
   */
  anchor?: (rect: Rect, name: BoundaryAnchorName, params: TParams) => Position | undefined;
};

/** Boundary 定义的擦除形态：registry 存这个 */
export type BoundaryDefinition = BoundaryDefinitionInput<IRJsonObject>;
