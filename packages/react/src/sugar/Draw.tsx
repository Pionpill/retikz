import type { FC } from 'react';
import type { IRPath, WayDSL } from '@retikz/core';
import { parseWay } from '@retikz/core';
import { Path } from '../kernel/Path';
import { Step } from '../kernel/Step';

/** <Draw> 组件的 props */
export type DrawProps = {
  /**
   * way 数组 DSL
   * @description 节点 id / 笛卡尔 / 极坐标 / 相对偏移 `{ position, type: DrawWay.Relative | DrawWay.Accumulate }` / 折角算子 `'-|'` `'|-'`（或 `DrawWay.Hv`/`DrawWay.Vh`）/ 闭合 `DrawWay.Cycle` / 曲线算子 `{ curve | cubic | bend }`（infix）/ 形状算子 `{ arc | circle | ellipse }`（infix，以"上一项"为圆心，不消耗下一项）/ 边标注算子 `{ label }`（infix，修饰下一段）
   */
  way: WayDSL;
  /** 描边色，省略时用 currentColor */
  stroke?: IRPath['stroke'];
  /** 描边宽度，省略时为 1 */
  strokeWidth?: IRPath['strokeWidth'];
  /** 描边 dash pattern（如 [4, 2]） */
  dashPattern?: IRPath['dashPattern'];
  /** 端点形状（TikZ `line cap`） */
  lineCap?: IRPath['lineCap'];
  /** 拐点形状（TikZ `line join`） */
  lineJoin?: IRPath['lineJoin'];
  /** 语义 stroke 档位（TikZ `ultra thin` … `ultra thick`）；显式 `strokeWidth` 始终优先 */
  thickness?: IRPath['thickness'];
  /**
   * 路径级箭头方向
   * @description `'->'` 终点 / `'<-'` 起点 / `'<->'` 两端；省略或 `'none'` 无箭头
   */
  arrow?: IRPath['arrow'];
  /**
   * 箭头详细配置
   * @description 顶层默认 + 可选 `start` / `end` 子对象逐字段 merge override；视觉字段含 `shape` / `scale` / `length` / `width` / `color` / `fill` / `opacity` / `lineWidth`。空心 shape 上 `fill` silent no-op
   */
  arrowDetail?: IRPath['arrowDetail'];
  /** 闭合区域填充色，省略 = 不填充。配合 way 末尾的 `DrawWay.Cycle` 画填充形状 */
  fill?: IRPath['fill'];
  /** 填充规则：`'nonzero'`（默认）/ `'evenodd'` */
  fillRule?: IRPath['fillRule'];
  /** 整 path 透明度 0~1 */
  opacity?: IRPath['opacity'];
  /** 仅 fill 透明度 0~1 */
  fillOpacity?: IRPath['fillOpacity'];
  /** 仅 stroke 透明度 0~1（TikZ `draw opacity`） */
  drawOpacity?: IRPath['drawOpacity'];
  /** 显式栈序：大者在上；缺省 0 = 声明顺序；同值稳定保序；只在同层子节点间生效 */
  zIndex?: IRPath['zIndex'];
};

/**
 * Sugar 组件——展开为等价的 <Path><Step.../></Path> Kernel 子树
 * @description way 数组解析委托给 core 的 parseWay，保证"Sugar 不引入新能力"；本组件由 <TikZ> builder 在 IR 构造阶段同步调用获取 Kernel JSX，不在 React render 调用栈上，因此不能使用 React hooks（useState / useMemo / useEffect 等会抛 "Invalid hook call"）
 */
export const Draw: FC<DrawProps> = props => {
  const {
    way,
    stroke,
    strokeWidth,
    dashPattern,
    lineCap,
    lineJoin,
    thickness,
    arrow,
    arrowDetail,
    fill,
    fillRule,
    opacity,
    fillOpacity,
    drawOpacity,
    zIndex,
  } = props;
  const steps = parseWay(way);

  return (
    <Path
      stroke={stroke}
      strokeWidth={strokeWidth}
      dashPattern={dashPattern}
      lineCap={lineCap}
      lineJoin={lineJoin}
      thickness={thickness}
      arrow={arrow}
      arrowDetail={arrowDetail}
      fill={fill}
      fillRule={fillRule}
      opacity={opacity}
      fillOpacity={fillOpacity}
      drawOpacity={drawOpacity}
      zIndex={zIndex}
    >
      {steps.map((s, i) => {
        if (s.kind === 'cycle') return <Step key={i} kind="cycle" />;
        if (s.kind === 'move') return <Step key={i} kind="move" to={s.to} />;
        if (s.kind === 'step')
          return <Step key={i} kind="step" via={s.via} to={s.to} label={s.label} />;
        if (s.kind === 'curve')
          return <Step key={i} kind="curve" to={s.to} control={s.control} label={s.label} />;
        if (s.kind === 'cubic')
          return (
            <Step
              key={i}
              kind="cubic"
              to={s.to}
              control1={s.control1}
              control2={s.control2}
              label={s.label}
            />
          );
        if (s.kind === 'bend') {
          if (s.bendAngle !== undefined) {
            return (
              <Step
                key={i}
                kind="bend"
                to={s.to}
                bendDirection={s.bendDirection}
                bendAngle={s.bendAngle}
                label={s.label}
              />
            );
          }
          return (
            <Step
              key={i}
              kind="bend"
              to={s.to}
              bendDirection={s.bendDirection}
              label={s.label}
            />
          );
        }
        if (s.kind === 'arc') {
          return (
            <Step
              key={i}
              kind="arc"
              startAngle={s.startAngle}
              endAngle={s.endAngle}
              radius={s.radius}
              label={s.label}
            />
          );
        }
        if (s.kind === 'circlePath') {
          return <Step key={i} kind="circlePath" radius={s.radius} label={s.label} />;
        }
        if (s.kind === 'ellipsePath') {
          return (
            <Step
              key={i}
              kind="ellipsePath"
              radiusX={s.radiusX}
              radiusY={s.radiusY}
              label={s.label}
            />
          );
        }
        return <Step key={i} kind="line" to={s.to} label={s.label} />;
      })}
    </Path>
  );
};
