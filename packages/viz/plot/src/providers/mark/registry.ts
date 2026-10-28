import type { IRChild, IRScope } from '@retikz/core';
import type { ExternalRow } from '@retikz/data';

import type { CoordinateFrame, MarkChannels, InputMarkInstance, MarkLoweringContext } from '../../contract';
import type { IRPlotMark } from '../../schemas';
import { BuiltinPlotMark } from '../../schemas';
import { intervalMarkDefinition, pathMarkDefinition, pointMarkDefinition } from './features';
import type { AnyMarkDefinition } from './types';

/**
 * mark lowering 行为注册表：每个内置 mark 对应一个注册项（lowerMark 按 type 查表分发）
 * @description 对齐仓库已有 composite / coordinate 工厂注册范式；新增内置 mark = 加一条注册项，不改 lowerMark。
 *   Plot mark schema 仍是静态单一真源，不由此表组装
 */
export const MARK_REGISTRY: Record<BuiltinPlotMark, AnyMarkDefinition> = {
  [BuiltinPlotMark.Point]: pointMarkDefinition,
  [BuiltinPlotMark.Path]: pathMarkDefinition,
  [BuiltinPlotMark.Interval]: intervalMarkDefinition,
};

const isScopeLayer = (layer: IRChild | null): layer is IRScope =>
  layer !== null && layer.type === 'scope' && 'children' in layer;

const applyScopeChannelDeliveries = (
  layer: IRChild | null,
  mark: IRPlotMark,
  rows: Array<ExternalRow>,
  channels: MarkChannels,
): IRChild | null => {
  if (!isScopeLayer(layer)) return layer;

  for (const entry of channels.scopeDeliveries ?? []) {
    entry.deliver(layer, entry.value, { mark, rows });
  }

  return layer;
};

/**
 * 执行已由 resolve 层选定的 mark definition，将数据行下沉成一个图层 Scope
 * @description **原则：尽可能用 Scope 承载共享信息，把每个 Node / Path 压到最小，以减小生成的 core IR 体积。**
 *   color 编码时按颜色分子 Scope；series 把记录拆成多系列（多线 / 分组 / 堆叠柱）。无可绘制图元返回 null。
 *   markProvenance 给定（provenance 开）→ 给图层 / series Path / datum Node 绑 id + 来源 meta
 */
export const lowerMark = (
  resolution: { definition: AnyMarkDefinition; operation: IRPlotMark },
  instances: InputMarkInstance,
  frame: CoordinateFrame,
  channels: MarkChannels = {},
  markContext?: MarkLoweringContext,
): IRChild | null => {
  return applyScopeChannelDeliveries(
    resolution.definition.lower(resolution.operation as never, instances, frame, channels, markContext),
    resolution.operation,
    instances.kind === 'rows' ? instances.rows : [],
    channels,
  );
};
