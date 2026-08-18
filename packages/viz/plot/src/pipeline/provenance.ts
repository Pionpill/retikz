import type { ExternalRow } from '@retikz/data';

import { resolveFieldPath } from '@retikz/data';

import type { DatumIdRegistrar } from '../contract';

import { slug } from '../contract';
import { RetikzPlotError } from '../error';

/**
 * 创建 plot 级 datum id 登记器。
 * @description 登记器跨 mark 共享；缺字段、重复 id 或 slug 后碰撞都会 fail-loud
 */
export const createDatumIdRegistrar = (datumIdField: string, plotId: string): DatumIdRegistrar => {
  const seenIds = new Map<string, unknown>();
  return (row: ExternalRow): string => {
    const raw = resolveFieldPath(row, datumIdField);
    if (raw === undefined) {
      throw new RetikzPlotError(
        `lowerPlots: datumIdField "${datumIdField}" missing on a row; every row must carry the id field (cannot synthesize a stable anchor)`,
      );
    }
    const id = `${plotId}.datum.${slug(raw)}`;
    const prior = seenIds.get(id);
    if (prior !== undefined && prior !== raw) {
      throw new RetikzPlotError(
        `lowerPlots: datumIdField "${datumIdField}" values "${String(prior)}" and "${String(raw)}" collide to the same datum id "${id}"; anchors must be unique`,
      );
    }
    if (seenIds.has(id)) {
      throw new RetikzPlotError(
        `lowerPlots: duplicate datumIdField "${datumIdField}" value "${String(raw)}" → duplicate datum id "${id}"; anchors must be unique`,
      );
    }
    seenIds.set(id, raw);
    return id;
  };
};
