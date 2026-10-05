import type { ExternalRow } from '@retikz/data';

import type {
  CoordinateFrame,
  DomainPaddingScale,
  DomainPaddingTarget,
  MarkPositionResolution,
  PositionScale,
} from '../../contract';
import { RetikzPlotError } from '../../error';
import { DomainPaddingClearanceSchema } from '../../schemas';
import type { IRPlotMarkDomainPadding, IRPlotScaleOperation } from '../../schemas';
import { resolveMarkChannels } from '../channel';
import type { ChannelResolveContext } from '../channel';
import type { MarkDataView } from '../coordinate';
import { resolveMarkOperation } from '../mark';
import type { MarkPaddingResolution, MarkPaddingSample } from './mark-padding';
import { solveMarkPadding } from './mark-padding';

/** 保留原始值供最终 provider 映射验证的内部约束 */
type MarkDomainSample = MarkPaddingSample & { value: unknown; actual?: number };

/** 同一共享域中的面板外缘约束 */
type DomainPaddingObservation = {
  samples: () => Array<MarkDomainSample>;
  mapping: DomainPaddingScale;
  range: readonly [number, number];
  length: number;
  clearance: MarkPaddingResolution;
  fixed: Partial<MarkPaddingResolution>;
};

/** 一次 lowering 内共享的数据与求解状态，不写入 Source */
export type MarkPaddingContext = ReturnType<typeof createMarkPaddingContext>;

/** 创建一次 lowering 的尺寸缓存及共享域约束协调器 */
export const createMarkPaddingContext = (
  channels: ChannelResolveContext,
  place?: (view: MarkDataView, frame: CoordinateFrame) => MarkPositionResolution | undefined,
) => {
  const identities = new WeakMap<Array<ExternalRow>, number>();
  let nextIdentity = 0;
  let revision = 0;
  const targets = new WeakMap<object, WeakMap<Array<ExternalRow>, Map<string, Array<DomainPaddingTarget>>>>();
  const mappings = new Map<string, DomainPaddingScale>();
  const protectedMarks = new WeakMap<PositionScale, ReadonlyArray<string>>();
  const groups = new Map<
    string,
    { observations: Map<string, DomainPaddingObservation>; padding?: MarkPaddingResolution }
  >();

  const identityOf = (rows: Array<ExternalRow>): number => {
    let identity = identities.get(rows);
    if (identity === undefined) {
      identity = nextIdentity++;
      identities.set(rows, identity);
    }

    return identity;
  };

  return {
    get revision() {
      return revision;
    },
    /** 每轮只收集本轮最终 range，不混用预布局尺寸或上轮约束 */
    beginLayout: (): void => {
      for (const group of groups.values()) group.observations.clear();
    },
    /** 布局完成后统一求解共享域，返回本轮是否已稳定 */
    finishLayout: (): boolean => {
      const previousRevision = revision;

      // 径向等后置角色先更新；角向边界可消费其最新映射
      for (const [groupKey, group] of [...groups].reverse()) {
        if (group.observations.size === 0) continue;

        const constraints: Array<MarkPaddingSample> = [];
        const fixed: Partial<MarkPaddingResolution> = {};
        let maximumLength = 1;
        const observations = [...group.observations].map(
          ([scope, observation]) => [scope, { ...observation, samples: observation.samples() }] as const,
        );

        for (const [, observation] of observations) {
          maximumLength = Math.max(maximumLength, observation.length);
          const [start, end] = observation.range;
          const parameter = observation.mapping.parameter ?? ((position: number) => (position - start) / (end - start));
          const direction = Math.sign(end - start);

          for (const sample of observation.samples)
            constraints.push({
              position: sample.position,
              lower: parameter(start + direction * (sample.lower + observation.clearance.lower), observation.range),
              upper: 1 - parameter(end - direction * (sample.upper + observation.clearance.upper), observation.range),
            });

          for (const side of ['lower', 'upper'] as const) {
            const value = observation.fixed[side];
            if (value === undefined) continue;

            const ratio =
              side === 'lower'
                ? parameter(start + direction * value, observation.range)
                : 1 - parameter(end - direction * value, observation.range);
            if (fixed[side] !== undefined && Math.abs(fixed[side] - ratio) > 1e-12) {
              throw new RetikzPlotError(`scale ${groupKey} has incompatible fixed padding across shared ranges`);
            }

            fixed[side] = ratio;
          }
        }

        let padding: MarkPaddingResolution;

        try {
          padding = solveMarkPadding(constraints, fixed, 0.01 / maximumLength);
        } catch (cause) {
          throw new RetikzPlotError(
            `scale ${groupKey}, scopes [${[...group.observations.keys()].join(', ')}]: mark domainPadding has no feasible positive range`,
            { cause },
          );
        }

        const previous = group.padding;
        if (
          previous !== undefined &&
          Math.abs(previous.lower - padding.lower) + Math.abs(previous.upper - padding.upper) < 0.01 / maximumLength &&
          constraints.every(sample => {
            const position = previous.lower + sample.position * (1 - previous.lower - previous.upper);
            return (
              (fixed.lower !== undefined || position >= sample.lower) &&
              (fixed.upper !== undefined || position <= 1 - sample.upper)
            );
          })
        )
          padding = previous;

        for (const [scope, observation] of observations) {
          const finalScale = observation.mapping.createScale(padding, observation.range);
          const [start, end] = finalScale.range();

          for (const sample of observation.samples) {
            if (
              sample.actual !== undefined &&
              (group.padding?.lower !== padding.lower || group.padding.upper !== padding.upper)
            )
              continue;

            const coordinate = sample.actual ?? finalScale.coordinate(sample.value);
            const distance = (coordinate - start) * Math.sign(end - start);
            if (
              !Number.isFinite(distance) ||
              (observation.fixed.lower === undefined && distance < sample.lower + observation.clearance.lower) ||
              (observation.fixed.upper === undefined &&
                observation.length - distance < sample.upper + observation.clearance.upper)
            ) {
              throw new RetikzPlotError(`scale ${groupKey} in scope "${scope}" cannot preserve final mark padding`);
            }
          }
        }

        if (
          group.padding === undefined ||
          group.padding.lower !== padding.lower ||
          group.padding.upper !== padding.upper
        ) {
          group.padding = padding;
          revision++;
        }
      }

      return previousRevision === revision;
    },
    mappingOf: (key: string, create: () => DomainPaddingScale): DomainPaddingScale => {
      let mapping = mappings.get(key);
      if (mapping === undefined) {
        mapping = create();
        mappings.set(key, mapping);
      }

      return mapping;
    },
    groupOf: (name: string, role: string, views: Array<MarkDataView>): string =>
      JSON.stringify([name, role, views.map(view => [view.markIndex, identityOf(view.dataView.rows)])]),
    /** 在当前映射上撤销留白，得到实际 placement 位置的基准参数 */
    positionOf: (
      key: string,
      coordinate: number,
      mapping: DomainPaddingScale,
      range: readonly [number, number],
    ): number => {
      const parameter = mapping.parameter?.(coordinate, range) ?? (coordinate - range[0]) / (range[1] - range[0]);
      const padding = groups.get(key)?.padding ?? { lower: 0, upper: 0 };
      return (parameter - padding.lower) / (1 - padding.lower - padding.upper);
    },
    placedTargetsOf: (view: MarkDataView, frame: CoordinateFrame): MarkPositionResolution | undefined =>
      place?.(view, frame),
    protects: (scale: PositionScale | undefined, mark: unknown): boolean =>
      scale !== undefined && typeof mark === 'string' && (protectedMarks.get(scale)?.includes(mark) ?? false),
    targetsOf: (view: MarkDataView, roles: ReadonlyArray<string>): Array<DomainPaddingTarget> => {
      let byRows = targets.get(view.mark);
      if (byRows === undefined) {
        byRows = new WeakMap();
        targets.set(view.mark, byRows);
      }

      let byRoles = byRows.get(view.dataView.rows);
      if (byRoles === undefined) {
        byRoles = new Map();
        byRows.set(view.dataView.rows, byRoles);
      }

      const roleKey = roles.join('|');
      const previous = byRoles.get(roleKey);
      if (previous !== undefined) return previous;

      const resolved = resolveMarkOperation(view.mark, { registry: channels.markRegistry });
      if (resolved.definition.domainPadding === undefined)
        throw new RetikzPlotError(`mark "${view.mark.id}" has no domainPadding capability`);

      const markChannels = resolveMarkChannels(view.mark, { ...channels, ...view.dataView });
      const result = resolved.definition.domainPadding(
        resolved.operation as never,
        view.dataView.rows,
        roles,
        markChannels,
      );

      for (const target of result) {
        if (
          target.values.length !== roles.length ||
          target.extent.length !== roles.length ||
          target.extent.some(radius => !Number.isFinite(radius) || radius < 0)
        ) {
          throw new RetikzPlotError(`mark "${view.mark.id}" returned invalid domainPadding targets`);
        }
      }

      byRoles.set(roleKey, result);

      return result;
    },
    scaleOf: (
      groupKey: string,
      scopeKey: string,
      source: IRPlotMarkDomainPadding,
      samples: () => Array<MarkDomainSample>,
      mapping: DomainPaddingScale,
      initialRange: readonly [number, number],
    ): PositionScale => {
      let group = groups.get(groupKey);
      if (group === undefined) {
        group = { observations: new Map() };
        groups.set(groupKey, group);
      }

      const activeGroup = group;

      const resolveRange = (range: readonly [number, number]): PositionScale => {
        const length = Math.abs(range[1] - range[0]);
        if (!Number.isFinite(length) || length <= 0)
          throw new RetikzPlotError(`scale ${groupKey} domainPadding requires positive range`);

        activeGroup.observations.set(scopeKey, {
          samples,
          mapping,
          range,
          length,
          clearance: {
            lower:
              (typeof source.clearance === 'object' ? source.clearance.lower : source.clearance) ??
              DomainPaddingClearanceSchema.parse(undefined),
            upper:
              (typeof source.clearance === 'object' ? source.clearance.upper : source.clearance) ??
              DomainPaddingClearanceSchema.parse(undefined),
          },
          fixed: { lower: source.lower, upper: source.upper },
        });

        return mapping.createScale(activeGroup.padding ?? { lower: 0, upper: 0 }, range);
      };

      let activeRange = initialRange;
      let activePadding = activeGroup.padding;
      let current = resolveRange(initialRange);

      const scale = (): PositionScale => {
        if (activePadding !== activeGroup.padding) {
          activePadding = activeGroup.padding;
          current = mapping.createScale(activePadding ?? { lower: 0, upper: 0 }, activeRange);
        }

        return current;
      };

      const result: PositionScale = {
        coordinate: value => scale().coordinate(value),
        domain: () => scale().domain(),
        range: () => scale().range(),
        ticks: count => scale().ticks(count),
        tickKind: current.tickKind,
        get bandwidth() {
          return scale().bandwidth;
        },
        get step() {
          return scale().step;
        },
        setRange: range => {
          activeRange = range;
          activePadding = activeGroup.padding;
          current = resolveRange(range);
        },
      };
      protectedMarks.set(result, source.marks);

      return result;
    },
  };
};

/** 读取公开 mark 分支，普通 padding 不进入逐点路径 */
export const markDomainPaddingOf = (scale: IRPlotScaleOperation): IRPlotMarkDomainPadding | undefined => {
  const padding = 'domainPadding' in scale ? scale.domainPadding : undefined;
  return typeof padding === 'object' && padding !== null && 'kind' in padding && padding.kind === 'mark'
    ? (padding as IRPlotMarkDomainPadding)
    : undefined;
};
