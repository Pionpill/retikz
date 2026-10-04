import type { Position } from '@retikz/math';

import { RetikzDiagramError, RetikzDiagramErrorCode } from '../../../errors';
import type {
  FlowLayoutEndpoint,
  FlowLayoutExecutionContext,
  FlowLayoutInput,
  FlowLayoutElementOutput,
} from '../../contract';
import type { FlowEndpointTarget } from '../../schemas';

/** 同一关系两端的唯一分配结果 */
export type FlowRelationEndpoints = Readonly<{ source: FlowEndpointTarget; target: FlowEndpointTarget }>;

/** 端点实际坐标比较，避免浮点查询误差产生虚假的分离 */
export const coincidentFlowEndpoints = (a: Readonly<Position>, b: Readonly<Position>): boolean =>
  a.every(
    (value, axis) => Math.abs(value - b[axis]) <= Number.EPSILON * 64 * Math.max(1, Math.abs(value), Math.abs(b[axis])),
  );

/** 无精确锚点时保留原中心参考点，有锚点时查询真实 Core 边界 */
export const resolveFlowEndpointPosition = (
  target: FlowEndpointTarget,
  elements: ReadonlyArray<FlowLayoutElementOutput>,
  context?: FlowLayoutExecutionContext,
): Readonly<Position> => {
  if (target.anchor !== undefined) {
    if (context === undefined)
      throw new RetikzDiagramError({
        code: RetikzDiagramErrorCode.FlowLayoutOutputInvalid,
        message: 'Endpoint query context is required.',
        details: { relatedIds: [target.id] },
      });
    return context.resolveEndpoint({ target, elements });
  }
  const bounds = elements.find(element => element.id === target.id)?.bounds;
  if (bounds === undefined)
    throw new RetikzDiagramError({
      code: RetikzDiagramErrorCode.FlowLayoutOutputInvalid,
      message: 'Endpoint has no layout bounds.',
      details: { relatedIds: [target.id] },
    });
  return [bounds.x + bounds.width / 2, bounds.y + bounds.height / 2];
};

type EndpointRecord = {
  input: FlowLayoutEndpoint;
  relationIndex: number;
  end: 'source' | 'target';
  side: NonNullable<FlowLayoutEndpoint['side']>;
  order: number;
  output: FlowEndpointTarget;
};

/** 生成可定位的分配失败，不改变固定锚点或关系 */
const allocationFailure = (record: EndpointRecord, reason: string): never => {
  throw new RetikzDiagramError({
    code: RetikzDiagramErrorCode.FlowConstraintUnsatisfiable,
    message: `Flow endpoint '${record.input.id}' cannot satisfy separation: ${reason}.`,
    details: { path: ['relations', record.relationIndex, record.end], relatedIds: [record.input.id], reason },
  });
};

/** 同节点汇总要求，按侧等分自动槽，固定锚点只作为不可移动约束 */
export const allocateFlowEndpoints = (
  input: FlowLayoutInput,
  elements: ReadonlyArray<FlowLayoutElementOutput>,
  context?: FlowLayoutExecutionContext,
): ReadonlyArray<FlowRelationEndpoints> => {
  const active = new Set(
    input.relations
      .flatMap(relation => [relation.source, relation.target])
      .filter(
        endpoint => endpoint.side !== undefined || endpoint.anchor !== undefined || endpoint.overlap === 'separate',
      )
      .map(endpoint => endpoint.id),
  );
  const records: Array<EndpointRecord> = [];
  for (const [relationIndex, relation] of input.relations.entries()) {
    for (const end of ['source', 'target'] as const) {
      const endpoint = relation[end];
      const other = relation[end === 'source' ? 'target' : 'source'];
      const bounds = elements.find(element => element.id === endpoint.id)!.bounds;
      const opposite = resolveFlowEndpointPosition({ id: other.id }, elements);
      const dx = (opposite[0] - bounds.x - bounds.width / 2) / (bounds.width || 1);
      const dy = (opposite[1] - bounds.y - bounds.height / 2) / (bounds.height || 1);
      const side =
        endpoint.side ?? (Math.abs(dx) >= Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : dy < 0 ? 'top' : 'bottom');
      records.push({
        input: endpoint,
        relationIndex,
        end,
        side,
        order: opposite[side === 'left' || side === 'right' ? 1 : 0],
        output: { id: endpoint.id, ...(endpoint.anchor === undefined ? {} : { anchor: endpoint.anchor }) },
      });
    }
  }
  for (const id of active) {
    const nodeRecords = records.filter(record => record.input.id === id);
    const placed = nodeRecords.filter(record => record.input.anchor !== undefined);
    const position = (record: EndpointRecord) => resolveFlowEndpointPosition(record.output, elements, context);
    const conflict = (record: EndpointRecord, others: ReadonlyArray<EndpointRecord>) =>
      others.some(
        other =>
          (record.input.overlap === 'separate' || other.input.overlap === 'separate') &&
          coincidentFlowEndpoints(position(record), position(other)),
      );
    placed.forEach((record, index) => {
      if (conflict(record, placed.slice(0, index))) allocationFailure(record, 'fixed-endpoint-conflict');
    });
    for (const side of ['top', 'right', 'bottom', 'left'] as const) {
      const automatic = nodeRecords.filter(record => record.input.anchor === undefined && record.side === side);
      const shared = automatic.filter(record => record.input.overlap === 'allow');
      const slots = automatic.filter(record => record.input.overlap === 'separate').map(record => [record]);
      if (shared.length) slots.push(shared);
      const order = (slot: ReadonlyArray<EndpointRecord>) =>
        slot.reduce((sum, record) => sum + record.order, 0) / slot.length;
      slots.sort(
        (a, b) =>
          order(a) - order(b) ||
          a[0].relationIndex - b[0].relationIndex ||
          (a[0].end === b[0].end ? 0 : a[0].end === 'source' ? -1 : 1),
      );
      for (const [index, slot] of slots.entries()) {
        const fraction = (index + 1) / (slots.length + 1);
        const assign = (value: number) =>
          slot.forEach(record => {
            record.output = { id, anchor: { side, fraction: value } };
          });
        assign(fraction);
        if (slot.some(record => conflict(record, placed))) {
          const occupied = placed.flatMap(record => {
            const anchor = record.output.anchor;
            return typeof anchor === 'object' && anchor.side === side ? [anchor.fraction] : [];
          });
          const cuts = [...new Set([0, 1, fraction, ...occupied])].sort((a, b) => a - b);
          const candidates = cuts
            .slice(1)
            .map((value, cutIndex) => (value + cuts[cutIndex]) / 2)
            .sort((a, b) => Math.abs(a - fraction) - Math.abs(b - fraction) || a - b);
          let matched = false;
          for (const candidate of candidates) {
            assign(candidate);
            if (slot.every(record => !conflict(record, placed))) {
              matched = true;
              break;
            }
          }
          if (!matched) allocationFailure(slot[0], 'endpoint-search-exhausted');
        }
        placed.push(...slot);
      }
    }
  }
  return input.relations.map((_, index) => ({
    source: records[index * 2].output,
    target: records[index * 2 + 1].output,
  }));
};
