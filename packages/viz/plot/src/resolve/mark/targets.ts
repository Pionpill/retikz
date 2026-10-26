import type { IRNodeTarget } from '@retikz/core';
import { resolveFieldPath } from '@retikz/data';

import type { AnchorOwner, MarkTargetResolution } from '../../contract';
import { pathStepTargets } from '../../contract';
import { RetikzPlotError } from '../../error';
import type { IRPlotMark } from '../../schemas';

/** 解析身份数据值，数值与同形字符串共享身份 */
const resolveTargetKey = (value: unknown, context: string): string => {
  if ((typeof value === 'string' && value.trim().length > 0) || (typeof value === 'number' && Number.isFinite(value)))
    return String(value);
  throw new RetikzPlotError(`Invalid mark target key ${String(value)}: ${context}`);
};

/** 创建单个实际视图的身份解析上下文，几何仍由 Core 消费 */
export const resolveMarkTargets = (marks: Array<IRPlotMark>, declarationOrder = marks): MarkTargetResolution => {
  const declarations = new Map<string, IRPlotMark>();
  for (const mark of marks) {
    if (mark.id === undefined) continue;
    if (declarations.has(mark.id)) throw new RetikzPlotError(`Duplicate mark id "${mark.id}"`);
    declarations.set(mark.id, mark);
  }
  for (const mark of marks) {
    if (mark.type !== 'path') continue;
    const references =
      mark.encodings.steps !== undefined
        ? mark.encodings.steps.flatMap((step, index) =>
            pathStepTargets(step).map(({ role, target }) => ({ role: `steps.${index}.${role}`, target })),
          )
        : mark.encodings.from === undefined
          ? []
          : [
              { role: 'from', target: mark.encodings.from },
              { role: 'to', target: mark.encodings.to },
            ];
    for (const { role, target: reference } of references) {
      if (!('mark' in reference)) continue;
      const context = `mark "${mark.id ?? declarationOrder.indexOf(mark)}" endpoint ${role} -> mark "${reference.mark}"`;
      const declaration = declarations.get(reference.mark);
      if (declaration === undefined) throw new RetikzPlotError(`Unknown target mark: ${context}`);
      if (declarationOrder.indexOf(declaration) >= declarationOrder.indexOf(mark))
        throw new RetikzPlotError(`Target mark must be declared before the connection: ${context}`);
      if (
        declaration.type === 'relation' ||
        (declaration.type === 'path' && declaration.encodings.position === undefined)
      )
        throw new RetikzPlotError(`Unsupported whole-path mark target: ${context}`);
      if (declaration.properties?.anchorId === undefined && declaration.encodings?.anchorId === undefined)
        throw new RetikzPlotError(`Target mark does not expose anchorId: ${context}`);
      if (mark.properties?.connection === 'coordinate')
        throw new RetikzPlotError(`Mark references cannot use coordinate connection: ${context}`);
    }
  }
  const targets = new Map<string, Map<string, { id: string; kind: 'node' | 'coordinate' }>>();
  const ownerText = (owner: AnchorOwner): string =>
    `mark "${owner.markId ?? owner.markIndex}" endpoint ${owner.role ?? 'target'} row ${owner.kind === 'row' ? owner.transformedIndex : 'single'}`;

  return {
    register: (identity, owner, kind) => {
      if (owner.markId === undefined) return;
      const key = resolveTargetKey(identity.key, ownerText(owner));
      let entries = targets.get(owner.markId);
      if (entries === undefined) {
        entries = new Map();
        targets.set(owner.markId, entries);
      }
      if (entries.has(key)) throw new RetikzPlotError(`Duplicate target key "${key}" in mark "${owner.markId}"`);
      entries.set(key, { id: identity.id, kind });
    },
    reference: (reference, instance, owner) => {
      const context = `${ownerText(owner)} -> mark "${reference.mark}"`;
      const key = resolveTargetKey(
        'value' in reference.key
          ? reference.key.value
          : instance.kind === 'row'
            ? resolveFieldPath(instance.row, reference.key.field)
            : undefined,
        context,
      );
      const resolved = targets.get(reference.mark)?.get(key);
      if (resolved === undefined) throw new RetikzPlotError(`Missing mark target key "${key}": ${context}`);
      if (resolved.kind === 'coordinate' && (reference.anchor !== undefined || reference.boundary !== undefined))
        throw new RetikzPlotError(`Coordinate target key "${key}" does not support anchor or boundary: ${context}`);
      const target: IRNodeTarget = {
        id: resolved.id,
        ...(reference.anchor === undefined ? {} : { anchor: reference.anchor }),
        ...(reference.offset === undefined ? {} : { offset: reference.offset }),
        ...(reference.boundary === undefined ? {} : { boundary: reference.boundary }),
      };
      return target;
    },
  };
};
