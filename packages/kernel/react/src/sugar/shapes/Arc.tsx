import type { IRStepRadius } from '@retikz/core';
import type { InputStepLabel } from '@retikz/vanilla';
import type { FC } from 'react';

import type { DslTarget } from '../../kernel/components';
import type { AngleInput, PathVisualProps } from './shape-helpers';

import { RetikzReactError, RetikzReactErrorCode } from '../../error';
import { Path } from '../../kernel/components';
import { Step } from '../../kernel/components';
import { pickPathVisual, resolveAngles } from './shape-helpers';

/**
 * `<Arc>` 形态：圆弧（radius number）/ 椭圆弧（radius {x,y}）；必给角度（startAngle / endAngle / sweepAngle 三选二）
 * @description 默认开放弧；给 `close="chord"`（弦闭合）或 `close="sector"`（连回圆心成扇形）可闭合成可填充区域。
 *   `label` 透传到底层弧 step，文字沿弧定位（`position` 缺省 midway，按 startAngle..endAngle 线性映射）
 */
export type ArcProps = PathVisualProps &
  AngleInput & {
    /** 闭合方式：缺省 / `'open'` 开放弧；`'chord'` 两端点连弦闭合；`'sector'` 连回圆心成扇形（均可填充） */
    close?: 'open' | 'chord' | 'sector';
    /** 弧上边标注（透传到底层 step；`position` 缺省 midway，沿弧 startAngle..endAngle 线性映射） */
    label?: InputStepLabel;
  } & { center: DslTarget; radius: IRStepRadius };

/**
 * Arc sugar——弧线（默认开放，可弦闭合 / 扇形闭合）
 * @description center 透传（任意 Target，可为节点 id / 极坐标）。
 *   开放弧展开为 `<Path><Step move(center)><Step arc(center)></Path>`（pen 停在弧端点，输出与旧版一致）；
 *   `close="chord"|"sector"` 改走 circlePath / ellipsePath 的对应 closed 模式（圆心 = 游标）
 */
export const Arc: FC<ArcProps> = props => {
  const angles = resolveAngles(props, 'Arc', true);
  if (!angles) throw new RetikzReactError(RetikzReactErrorCode.Sugar, '<Arc> 需给角度');
  const { startAngle, endAngle } = angles;
  const center = props.center;
  const radius = props.radius;
  const circular = typeof radius === 'number';
  const close = props.close ?? 'open';
  const visual = pickPathVisual(props);

  // 开放弧：保留 arc step（pen 落在弧端点；输出与旧版逐字段一致）
  if (close === 'open') {
    return (
      <Path {...visual}>
        <Step kind="move" to={center} />
        {circular ? (
          <Step
            kind="arc"
            center={center}
            startAngle={startAngle}
            endAngle={endAngle}
            radius={radius}
            label={props.label}
          />
        ) : (
          <Step
            kind="arc"
            center={center}
            startAngle={startAngle}
            endAngle={endAngle}
            radius={radius}
            label={props.label}
          />
        )}
      </Path>
    );
  }

  // 闭合弧（chord / sector）：走 circlePath / ellipsePath（圆心 = 游标 = center）
  return (
    <Path {...visual}>
      <Step kind="move" to={center} />
      {circular ? (
        <Step
          kind="circlePath"
          radius={radius}
          startAngle={startAngle}
          endAngle={endAngle}
          closed={close}
          label={props.label}
        />
      ) : (
        <Step
          kind="ellipsePath"
          radius={radius}
          startAngle={startAngle}
          endAngle={endAngle}
          closed={close}
          label={props.label}
        />
      )}
    </Path>
  );
};
