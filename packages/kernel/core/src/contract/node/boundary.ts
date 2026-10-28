import type { JsonObject, OpenString } from '@retikz/foundation';
import type { CenteredBox, Position } from '@retikz/math';
import type { ZodType } from 'zod';

import type { Anchor } from '../../shared';
import type { PathCommand } from '../scene';
import type { ConnectionEnvelopeKind } from './shape';

/** Boundary provider 解析实例连接矩形时可用的视觉几何上下文 */
export type BoundaryFitContext = {
  /** 节点视觉 shape 的外接矩形 */
  visualRect: CenteredBox;
  /** 获取视觉 shape 对指定规则连接面的安全包络 */
  computeConnectionEnvelope: (kind: ConnectionEnvelopeKind) => CenteredBox;
};

/**
 * boundary definition 的作者侧输入形态
 * @template TParams 由 paramsSchema 解析得到的 JSON 对象类型，各连接面回调接收同一参数类型
 */
export type InputBoundaryDefinition<TParams extends JsonObject> = {
  /** 注册表 key，由 IR `boundary` 引用 */
  name: string;
  /** 运行时连接面参数的 schema */
  paramsSchema: ZodType<TParams>;
  /**
   * 根据视觉 shape 和实例 params 解析本连接面使用的矩形
   * @description 未提供时使用视觉矩形
   * @default context.visualRect
   */
  resolveRect?: (context: BoundaryFitContext, params: TParams) => CenteredBox;
  /**
   * 返回与解析后 rect 同坐标系的精确闭合连接面轮廓；空数组表示合法空几何
   * @description 可选，主要供 Inspect 调试时显示连接面轮廓，通常可以省略。省略不影响连接点或锚点计算，但 Inspect 无法显示精确连接面轮廓；提供此方法不会让连接面在正常绘制中显示
   * @default undefined
   */
  computeOutline?: (rect: CenteredBox, params: TParams) => ReadonlyArray<PathCommand>;
  /** 从中心指向 toward 的射线与连接面的交点 */
  computeBoundaryPoint: (rect: CenteredBox, toward: Position, params: TParams) => Position;
  /**
   * 可选的标准方位 anchor 支持；Node 引用中的中心与形状专属名称不调用此回调
   * @description 未提供时由调用方回退或报告不支持该 anchor
   * @default undefined
   */
  resolveAnchor?: (rect: CenteredBox, name: OpenString<Anchor>, params: TParams) => Position | undefined;
};

/** Boundary 定义的擦除形态：registry 存这个 */
export type BoundaryDefinition = InputBoundaryDefinition<JsonObject>;

/**
 * 创建可注入编译配置的连接面定义，保留定义时的参数类型检查
 * @description 将返回值加入 CompileOptions.boundaries 后，节点或路径端点可通过 boundary 引用其 name。此函数不注册连接面，也不解析实例参数
 * @template TParams 由 paramsSchema 解析得到的 JSON 对象类型，各连接面回调接收同一参数类型
 * @param def 连接面名称、参数 schema 与连接几何回调
 * @returns 原定义对象，类型转换为可存入连接面注册表的 BoundaryDefinition；不复制或修改输入
 */
export const defineBoundary = <TParams extends JsonObject>(def: InputBoundaryDefinition<TParams>): BoundaryDefinition =>
  def as unknown as BoundaryDefinition;
