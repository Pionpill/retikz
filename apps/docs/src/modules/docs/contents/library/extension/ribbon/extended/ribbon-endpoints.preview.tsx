import type { IRRibbonPathOptions } from '@retikz/extension';
import { RibbonPathKindDefinition } from '@retikz/extension';
import { vector2 } from '@retikz/math';
import { Layout, Path, Step } from '@retikz/react';

/** 图形参数 */
export type RibbonEndpointsPreviewValues = {
  centerline: 'curve' | 'line';
  align: 'center' | 'left' | 'right';
  cap: 'round' | 'butt' | 'square' | 'arc';
  width: number;
  arcAngle: number;
  startDirection: 'auto' | 'angle';
  endDirection: 'auto' | 'angle';
  startAngle: number;
  endAngle: number;
};

/** 绘制示例图形 */
export const renderRibbonEndpointsPreview = (values: RibbonEndpointsPreviewValues) => {
  // 将默认二次曲线等价转为三次曲线；指定端面角度时，转动对应手柄并保持长度
  const handleLength = (2 / 3) * Math.hypot(190, 135);
  const control1 =
    values.startDirection === 'auto'
      ? vector2.add([-190, 20], vector2.scale([190, -135], 2 / 3))
      : vector2.add([-190, 20], vector2.scale(vector2.fromAngleDegrees(values.startAngle - 90), handleLength));
  const control2 =
    values.endDirection === 'auto'
      ? vector2.add([190, 20], vector2.scale([-190, -135], 2 / 3))
      : vector2.sub([190, 20], vector2.scale(vector2.fromAngleDegrees(values.endAngle - 90), handleLength));

  // 宽度是弦长；由圆心角推导局部圆心和半径，保持圆弧通过两侧接点
  const halfAngle = (values.arcAngle * Math.PI) / 360;
  const halfWidth = values.width / 2;
  const cap: NonNullable<Extract<IRRibbonPathOptions, { mode?: 'centerline' }>['start']>['cap'] =
    values.cap === 'arc'
      ? {
          name: 'arc',
          params: {
            center: [-halfWidth / Math.tan(halfAngle), 0],
            radius: halfWidth / Math.sin(halfAngle),
            sweep: values.arcAngle > 180 ? 'long' : 'short',
          },
        }
      : { name: values.cap };

  return (
    <Layout
      viewBox={{ x: -290, y: -170, width: 580, height: 360 }}
      extensions={{ pathKinds: [RibbonPathKindDefinition] }}
    >
      <Path
        kind="ribbon"
        kindOptions={{
          width: { kind: 'fixed', value: values.width },
          align: values.align,
          start: { cap, direction: values.startDirection === 'auto' ? 'auto' : values.startAngle },
          end: { cap, direction: values.endDirection === 'auto' ? 'auto' : values.endAngle },
          sampling: { kind: 'fixed', samples: 64 },
        }}
        style={{ fill: '#60a5fa', fillOpacity: 0.75, stroke: '#2563eb', strokeWidth: 1 }}
      >
        <Step kind="move" to={[-190, 20]} />
        {values.centerline === 'curve' ? (
          <Step kind="cubic" control1={control1} control2={control2} to={[190, 20]} />
        ) : (
          <Step kind="line" to={[190, 20]} />
        )}
      </Path>
    </Layout>
  );
};
