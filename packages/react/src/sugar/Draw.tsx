import type { FC } from 'react';
import type { IRPath, WayDSL } from '@retikz/core';
import { parseWay } from '@retikz/core';
import { Path } from '../kernel/Path';
import { Step } from '../kernel/Step';

/** <Draw> 组件的 props */
export type DrawProps = {
  /**
   * way 数组 DSL：节点 id / 笛卡尔 / 极坐标 / 折角算子 `'-|'` `'|-'` /
   * 闭合 `DrawWay.cycle` / 曲线算子 `{ curve | cubic | bend }`（infix）
   */
  way: WayDSL;
  /** 描边色，省略时用 currentColor */
  stroke?: IRPath['stroke'];
  /** 描边宽度，省略时为 1 */
  strokeWidth?: IRPath['strokeWidth'];
  /** SVG stroke-dasharray 模式（如 "4 2"） */
  strokeDasharray?: IRPath['strokeDasharray'];
  /**
   * 路径级箭头方向。`'->'` = 终点；`'<-'` = 起点；`'<->'` = 两端；
   * 省略或 `'none'` = 无箭头。
   */
  arrow?: IRPath['arrow'];
  /**
   * 箭头形状。默认 `'normal'`。其他：`'open'` / `'stealth'` / `'diamond'` / `'circle'`。
   */
  arrowShape?: IRPath['arrowShape'];
  /** 闭合区域填充色，省略 = 不填充。配合 way 末尾的 `DrawWay.cycle` 画填充形状 */
  fill?: IRPath['fill'];
  /** SVG fill-rule：`'nonzero'`（默认）/ `'evenodd'` */
  fillRule?: IRPath['fillRule'];
};

/**
 * Sugar 组件——展开为等价的 <Path><Step.../></Path> Kernel 子树。
 * way 数组的解析委托给 core 的 parseWay，保证"Sugar 不引入新能力"。
 *
 * 注意：本组件由 <Tikz> 的 builder 在 IR 构造阶段同步调用以获取 Kernel JSX，
 * 不在 React render 调用栈上，因此实现里不能使用 React hooks
 * （useState / useMemo / useEffect 等会抛 "Invalid hook call"）。
 */
export const Draw: FC<DrawProps> = props => {
  const { way, stroke, strokeWidth, strokeDasharray, arrow, arrowShape, fill, fillRule } = props;
  const steps = parseWay(way);

  return (
    <Path
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeDasharray={strokeDasharray}
      arrow={arrow}
      arrowShape={arrowShape}
      fill={fill}
      fillRule={fillRule}
    >
      {steps.map((s, i) => {
        if (s.kind === 'cycle') return <Step key={i} kind="cycle" />;
        if (s.kind === 'move') return <Step key={i} kind="move" to={s.to} />;
        if (s.kind === 'step') return <Step key={i} kind="step" via={s.via} to={s.to} />;
        if (s.kind === 'curve')
          return <Step key={i} kind="curve" to={s.to} control={s.control} />;
        if (s.kind === 'cubic')
          return (
            <Step
              key={i}
              kind="cubic"
              to={s.to}
              control1={s.control1}
              control2={s.control2}
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
              />
            );
          }
          return (
            <Step key={i} kind="bend" to={s.to} bendDirection={s.bendDirection} />
          );
        }
        // ADR-0002 task 4: 真正的 Step.arc / circlePath / ellipsePath 由后续 task 接入
        if (s.kind === 'arc') return null;
        if (s.kind === 'circlePath') return null;
        if (s.kind === 'ellipsePath') return null;
        return <Step key={i} kind="line" to={s.to} />;
      })}
    </Path>
  );
};
