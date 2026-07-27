# ADR-05：坐标系局部标架与实验性 custom coordinate

- 状态：Superseded
- 决策日期：2026-06-09
- 取代日期：2026-06-18
- 取代者：[alpha.12 ADR-05：coordinate registry](../alpha.12/05-coordinate-registry.md)
- 关联：[plot v0.1-alpha.9 roadmap](./roadmap.md) · [plot-design §3.5 / §8.3](../../../../../architecture/plot-design.md)

## 背景

alpha.9 的实验性 custom coordinate 用 `{ type:'custom', name, roles, params }` 引用运行时投影工厂，并通过 `projectRoles()` 证明任意参数化坐标系可以接入 Plot。曲线轴仍需数值差分重建局部切向，因此需要一个可选的解析局部标架契约。

## 当时的决策

- `CoordinateFrame` 增加可选 `frameAlong(role, values)`，返回轴曲线在屏幕空间的 `origin` 与原始幅值 `tangent`；曲线轴优先使用它，缺省回落到数值差分。
- 投影与 `frameAlong` 都是 runtime 函数，不进入 JSON IR。
- 实验性 custom operation 保存 `name`、`roles` 与 JSON-safe `params`，运行时通过独立工厂表解析。
- 3D、完整 chart 雅可比、子流形标架、法丛 mark、跨 plot 组合与自定义网格不在范围内。

## 被取代的原因

alpha.12 证明“内置坐标系走 bespoke 分支、自定义坐标系走 custom 工厂”仍是两套机制。coordinate registry 将内置与自定义能力统一为 `CoordinateDefinition { schema, roles, resolve }`：

- 自定义 IR 改为 `{ type:<customType>, ...config }`，不再使用 `{ type:'custom', name, roles, params }`。
- `roles` 上移到 definition，成为坐标系固有契约。
- `options.coordinates` 改为 `Array<CoordinateDefinition>`，registry 统一处理注册、冲突、查找与 schema 校验。
- `frameAlong` 作为 `createCoordinateFrame()` 的可选几何能力保留，并由同一 guide lowering 消费。

因此，本 ADR 关于局部轴标架的几何判断仍有效，但其 custom operation、工厂注入与公开 API 方案已整体由 alpha.12 ADR-05 取代。当前契约以 coordinate registry、代码与文档站为准。

## 兼容性

实验性 `PlotCoordinate.Custom`、`createCustomFrame` 与 Record 形态 coordinates 未作为稳定版本发布，不保留 alias。迁移到 `defineCoordinate()`、`CoordinateDefinition`、`createCoordinateFrame()` 与数组形态 `coordinates`。

## 实现指针

- 当前 definition：`packages/viz/plot/src/contract/coordinate/define.ts`
- 当前 registry：`packages/viz/plot/src/providers/coordinate/registry.ts`
- 当前 guide 消费：`packages/viz/plot/src/pipeline/guide/guide.ts`
- 用户文档：`/viz/plot/coordinate/custom-coordinate`

> 本 ADR 已在 plot v0.1-beta.2 收尾时压缩；完整实验性方案保留在本文件的 Proposed 历史版本中。
