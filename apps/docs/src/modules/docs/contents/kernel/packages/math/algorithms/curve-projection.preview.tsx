import type { CurveSegment, Position } from '@retikz/math';
import { curve } from '@retikz/math';
import { Draw, Layout, Node, Path, Step } from '@retikz/react';
import { Circle } from '@retikz/standard-react/shape';
import { Fragment } from 'react';

import type { Lang } from '@/i18n';

import { curveProjectionI18n } from './curve-projection.i18n';

/** 曲线控制点和单位投影方向 */
export type CurveProjectionValues = { kind: CurveSegment['kind']; controlX: number; controlY: number; angle: number };

/** 数学坐标统一放大显示，数值读数保留原单位 */
const displayPoint = ([x, y]: Position): Position => [x * 6, (y - 10) * 6];

/** 展示真实曲线极值与两条垂直于投影方向的支撑线 */
export const renderCurveProjection = (values: CurveProjectionValues, lang: Lang = 'zh') => {
  const i18n = curveProjectionI18n[lang];
  const segments: Record<CurveSegment['kind'], CurveSegment> = {
    line: { kind: 'line', from: [0, 0], to: [12, 20] },
    quadraticBezier: {
      kind: 'quadraticBezier',
      from: [0, 0],
      control: [values.controlX, values.controlY],
      to: [0, 20],
    },
    cubicBezier: {
      kind: 'cubicBezier',
      from: [0, 0],
      control1: [values.controlX, values.controlY],
      control2: [-12, 15],
      to: [0, 20],
    },
    arc: { kind: 'arc', center: [0, 10], radius: 10, startAngleDeg: -90, endAngleDeg: 90 },
    ellipseArc: { kind: 'ellipseArc', center: [0, 10], radiusX: 15, radiusY: 8, startAngleDeg: -120, endAngleDeg: 120 },
  };
  const segment = segments[values.kind];
  const radians = (values.angle * Math.PI) / 180;
  const axis: Position = [Math.cos(radians), Math.sin(radians)];
  const range = curve.projectedRange(segment, axis);
  // 支撑线经过满足 dot(point, axis) = value 的点，并沿法向延伸
  const support = (value: number): Array<Position> => {
    const offset = value - 10 * axis[1];
    const center: Position = [offset * axis[0], 10 + offset * axis[1]];
    return [-14, 14].map(t => displayPoint([center[0] - t * axis[1], center[1] + t * axis[0]]));
  };
  const from = displayPoint(curve.sampleAt(segment, 0).point);
  const to = displayPoint(curve.sampleAt(segment, 1).point);
  const controls =
    segment.kind === 'quadraticBezier'
      ? [segment.control]
      : segment.kind === 'cubicBezier'
        ? [segment.control1, segment.control2]
        : [];
  const curveStep =
    segment.kind === 'line' ? (
      <Step kind="line" to={to} />
    ) : segment.kind === 'quadraticBezier' ? (
      <Step kind="curve" control={displayPoint(segment.control)} to={to} />
    ) : segment.kind === 'cubicBezier' ? (
      <Step kind="cubic" control1={displayPoint(segment.control1)} control2={displayPoint(segment.control2)} to={to} />
    ) : (
      <Step
        kind="arc"
        center={displayPoint(segment.center)}
        radius={segment.kind === 'arc' ? segment.radius * 6 : { x: segment.radiusX * 6, y: segment.radiusY * 6 }}
        startAngle={segment.startAngleDeg}
        endAngle={segment.endAngleDeg}
      />
    );
  const textStyle = { stroke: 'none', fill: 'none', textColor: 'currentColor', font: { size: 12 } };
  return (
    <Layout viewBox={{ x: -220, y: -180, width: 440, height: 360 }}>
      {controls.length > 0 && (
        <Draw
          way={[from, ...controls.map(displayPoint), to]}
          style={{ stroke: '#94a3b8', dashPattern: [1, 4], lineCap: 'round' }}
        />
      )}
      <Draw way={support(range.min)} style={{ stroke: '#64748b', dashPattern: [4, 4] }} />
      <Draw way={support(range.max)} style={{ stroke: '#64748b', dashPattern: [4, 4] }} />
      <Path style={{ stroke: '#3b82f6', strokeWidth: 3, fill: 'none' }}>
        <Step kind="move" to={from} />
        {curveStep}
      </Path>
      {[from, to].map((position, index) => (
        <Circle key={index} center={position} radius={4} style={{ fill: '#3b82f6', stroke: 'none' }} />
      ))}
      {controls.map((control, index) => {
        const position = displayPoint(control);
        return (
          <Fragment key={index}>
            <Circle center={position} radius={4} style={{ fill: '#94a3b8', stroke: 'none' }} />
            <Node
              position={[position[0], position[1] - 16]}
              style={textStyle}
            >{`C${controls.length > 1 ? index + 1 : ''} (${control[0]}, ${control[1]})`}</Node>
          </Fragment>
        );
      })}
      <Node
        position={[0, -158]}
        style={textStyle}
      >{`min = ${range.min.toFixed(2)}    max = ${range.max.toFixed(2)}`}</Node>
      <Draw
        way={[
          [-165 - 17.5 * axis[0], -17.5 * axis[1]],
          [-165 + 17.5 * axis[0], 17.5 * axis[1]],
        ]}
        arrow="->"
        style={{ stroke: '#64748b' }}
      />
      <Node position={[-165, 38]} style={textStyle}>
        {i18n.axis}
      </Node>
    </Layout>
  );
};
