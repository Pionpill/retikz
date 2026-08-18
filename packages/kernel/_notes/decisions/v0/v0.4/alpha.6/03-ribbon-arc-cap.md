# ADR-03：Ribbon arc cap

- 状态：被 ADR-07 收敛
- 决策日期：2026-06-25
- 关联：[ADR-07](./07-path-kind-registry.md)

## 背景

Circular flow、chord 和极坐标流图需要沿圆弧连接 ribbon 两侧边界；只支持直线闭合会造成不自然的轮廓和命中区域

## 决策

Ribbon 端点支持 JSON-safe 的 arc 描述，公开位置为 `Path.ribbon.start.cap` 与 `Path.ribbon.end.cap`。描述包含圆心、半径和扫掠方向，由 Core 在编译期验证并转换为闭合 path 段

Arc cap 是 ribbon 几何的一部分，不是 renderer 后处理；输入不得包含函数。无法连接两侧边界、产生非有限或无效几何时 compile 必须 fail-loud。该能力只描述端点闭合方式，不引入 chord/Sankey 布局

## 兼容性与最终结果

Arc cap 随 ribbon path options 收敛到 ADR-07 的 Path kind registry，并由普通 Scene path primitive 输出；renderer 不再拥有独立 cap 语义

## 遗留边界

不定义通用圆弧路径、领域布局或 renderer-specific cap；其它端点样式须沿 Path contract 另行扩展
