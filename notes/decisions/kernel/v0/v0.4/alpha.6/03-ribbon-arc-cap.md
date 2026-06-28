# ADR-03：Ribbon arc cap

- 状态：被 ADR-07 收敛
- 决策日期：2026-06-25
- Owner：core
- 关联：[kernel v0.4-alpha.6 roadmap](./roadmap.md) · [ADR-01](./01-ribbon.md) · [ADR-02](./02-ribbon-boundary-and-alignment.md) · [ADR-07](./07-path-kind-registry.md)

## 背景

ribbon 端点既可能是普通直线闭合，也可能需要沿圆弧连接两侧边界。尤其是 chord、circular flow 或极坐标流图中，端点 cap 如果只允许 line join，会在视觉和命中区域上都显得不自然。

## 决策记录

ribbon 端点 cap 支持 JSON-safe 的 arc 描述，最终位于 `Path.ribbon.start.cap` / `Path.ribbon.end.cap`。arc cap 描述圆心、半径与扫掠方向，由 core 在编译期验证并转换为闭合 path 段。

稳定结论：

- arc cap 是 ribbon 几何的一部分，不是 renderer 后处理。
- cap 输入必须是数据对象，不能是回调函数。
- 当 arc 无法连接 ribbon 两侧边界，或参数导致无效几何时，compile 必须 fail-loud。
- arc cap 不引入 Sankey/chord layout；它只描述端点闭合方式。

## 被否决方案

- 只提供 `round` / `butt` 字符串枚举：表达力不足，无法描述指定圆心/半径的 circular cap。
- 让 renderer 自行 round cap：各 renderer 对闭合轮廓、命中区域和 label boundary 的理解会分叉。
- 在 plot 中专门处理 chord cap：会让 core ribbon 对 circular flow 不完整。

## 实现指针

- 最终公开契约见 [ADR-07](./07-path-kind-registry.md)，arc cap 作为 ribbon path options 的端点子字段存在。
- 发布版本：kernel group `v0.4.0-alpha.6`。
- 验收范围：core ribbon geometry 端点闭合、无效 cap 诊断与 renderer-agnostic path primitive 输出。

> 🔄 本文件压缩前完整施工蓝图 = `git show a1afbddcd7f916acacc98a6bc4be9b49a7cb0f33:notes/decisions/kernel/v0/v0.4/alpha.6/03-ribbon-arc-cap.md`（封板全文）。
