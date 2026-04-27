import type { FC } from 'react';
import type { IRPath, WayDSL } from '@retikz/core';
import { parseWay } from '@retikz/core';
import { Path } from '../kernel/Path';
import { Step } from '../kernel/Step';

/** <Draw> 组件的 props */
export type DrawProps = {
  /** way 数组 DSL：节点 id 字符串、坐标 [x, y]、极坐标对象 */
  way: WayDSL;
  /** 描边色，省略时用 currentColor */
  stroke?: IRPath['stroke'];
  /** 描边宽度，省略时为 1 */
  strokeWidth?: IRPath['strokeWidth'];
  /** SVG stroke-dasharray 模式（如 "4 2"） */
  strokeDasharray?: IRPath['strokeDasharray'];
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
  const { way, stroke, strokeWidth, strokeDasharray } = props;
  const steps = parseWay(way);

  return (
    <Path stroke={stroke} strokeWidth={strokeWidth} strokeDasharray={strokeDasharray}>
      {steps.map((s, i) =>
        s.kind === 'move' ? <Step key={i} kind="move" to={s.to} /> : <Step key={i} kind="line" to={s.to} />,
      )}
    </Path>
  );
};
