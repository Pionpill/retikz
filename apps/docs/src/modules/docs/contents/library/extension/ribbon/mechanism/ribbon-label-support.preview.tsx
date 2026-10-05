import type { RibbonCapContext } from '@retikz/extension';
import {
  ArcRibbonCapDefinition,
  ButtRibbonCapDefinition,
  RibbonPathKindDefinition,
  RoundRibbonCapDefinition,
  SquareRibbonCapDefinition,
} from '@retikz/extension';
import type { Position } from '@retikz/math';
import { curve } from '@retikz/math';
import { Draw, Layout, Node, Path, Scope, Step } from '@retikz/react';

/** 端帽支撑线示例的交互参数 */
export type RibbonLabelSupportPreviewValues = {
  cap: 'butt' | 'round' | 'square' | 'arc';
  arcAngle: number;
  width: number;
  distance: number;
};

/** 用真实端帽 Definition 与 Math 投影极值计算右端支撑位置 */
export const renderRibbonLabelSupportPreview = (values: RibbonLabelSupportPreviewValues) => {
  // 固定端面弦长，根据圆弧角度反推圆心与半径，保持两侧接点不变
  const halfAngle = (values.arcAngle * Math.PI) / 360;
  const halfWidth = values.width / 2;
  const arcParams = ArcRibbonCapDefinition.paramsSchema.parse({
    center: [-halfWidth / Math.tan(halfAngle), 0],
    radius: halfWidth / Math.sin(halfAngle),
  });
  const cap = { name: values.cap, params: values.cap === 'arc' ? arcParams : {} };
  const context = {
    endpoint: 'end',
    center: [120, 0],
    sectionAxis: [0, 1],
    outward: [1, 0],
    width: values.width,
  } satisfies Omit<RibbonCapContext, 'params'>;
  const geometry =
    values.cap === 'arc'
      ? ArcRibbonCapDefinition.resolve({ ...context, params: arcParams })
      : { butt: ButtRibbonCapDefinition, round: RoundRibbonCapDefinition, square: SquareRibbonCapDefinition }[
          values.cap
        ].resolve({ ...context, params: {} });
  const projections: Array<number> = [];
  let cursor: Position = [120, 0];

  for (const command of geometry.commands) {
    if (command.kind === 'move') {
      cursor = command.to;
      projections.push(cursor[0]);
    } else if (command.kind === 'line') {
      projections.push(curve.projectedRange({ kind: 'line', from: cursor, to: command.to }, [1, 0]).max);
      cursor = command.to;
    } else if (command.kind === 'arc') {
      projections.push(
        curve.projectedRange(
          {
            kind: 'arc',
            center: command.center,
            radius: command.radius,
            startAngleDeg: command.startAngle,
            endAngleDeg: command.endAngle,
          },
          [1, 0],
        ).max,
      );
    }
  }

  const supportX = Math.max(...projections);
  const label = {
    placement: 'outside' as const,
    distance: values.distance,
    rotate: 'none' as const,
    textColor: 'currentColor',
    font: { size: 16 },
  };

  return (
    <Layout
      width={440}
      height={180}
      viewBox={{ x: -220, y: -90, width: 440, height: 180 }}
      style={{ maxWidth: '100%', height: 'auto' }}
      extensions={{ pathKinds: [RibbonPathKindDefinition] }}
    >
      <Path
        kind="ribbon"
        kindOptions={{
          width: { kind: 'fixed', value: values.width },
          start: { cap, label: { ...label, text: 'A' } },
          end: { cap, label: { ...label, text: 'B' } },
        }}
        label={{ text: 'M', placement: 'inside', sloped: true }}
        style={{ fill: 'dodgerblue', fillOpacity: 0.22, stroke: 'dodgerblue', strokeWidth: 2 }}
      >
        <Step kind="move" to={[-120, 0]} />
        <Step to={[120, 0]} />
      </Path>
      {[-1, 1].map(side => (
        <Scope key={side}>
          <Draw
            way={[
              [side * supportX, -50],
              [side * supportX, 50],
            ]}
            style={{ stroke: 'gray', dashPattern: [4, 4] }}
          />
          <Draw
            way={[
              [side * supportX, -60],
              [side * (supportX + 30), -60],
            ]}
            arrow="->"
            style={{ stroke: 'gray' }}
          />
          <Node
            position={[side * supportX, 0]}
            shape="circle"
            layout={{ minimumSize: 4, padding: 0 }}
            style={{ stroke: 'none', fill: 'darkorange' }}
          />
          <Node
            position={[side * 120, 66]}
            text={`h = ${Math.round((supportX - 120) * 100) / 100}`}
            style={{ stroke: 'none', font: { size: 12 }, textColor: 'gray' }}
          />
        </Scope>
      ))}
    </Layout>
  );
};
