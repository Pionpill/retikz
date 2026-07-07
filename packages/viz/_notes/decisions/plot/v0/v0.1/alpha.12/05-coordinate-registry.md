# ADR-05：coordinate registry

状态：Accepted
决策日期：2026-06-18
关联：[plot v0.1-alpha.12 roadmap](./roadmap.md) · [ADR-03 mark registry](./03-mark-abstraction-registry.md) · [ADR-06 transform registry](./06-transform-registry.md) · [ADR-07 scale registry](./07-scale-registry.md) · [plot-design.md §8.3](../../../../../architecture/plot-design.md)

## 背景

coordinate 是 mark、guide、locator 的投影底座。旧实现把 cartesian2D、polar2D、cartesian1D、polar1D、ternary2D 与 custom 分支写死在 `resolveFrame` 中，并用多张 constants 表维护 roles、required channels 与 guide dimension 规则。

这种结构让内置坐标系享有私有入口，自定义坐标系走另一套 `custom` 工厂，不符合 alpha.12 建立的 registry / definition 方向，也不利于长尾坐标系扩展。

## 决策

把 coordinate 分成两层：

- **coordinate op**：`spec.coordinate` 中的纯 JSON `{ type, ...config }`，进入 IR。
- **coordinate definition**：运行时 `{ schema, roles, resolve }` 对象，经 `options.coordinates` 注入，不进入 IR。

`resolveFrame` 的 bespoke 分支收敛为 registry 查找：内置 5 个坐标系也注册为 `CoordinateDefinition`，自定义坐标系通过 `defineCoordinate` 提供同形 definition。registry 以 schema 中的 `type` literal 提取注册键，内置为底，自定义合并；重复 type 或未注册 type 均 fail-loud。

自定义 coordinate IR 从旧 `{ type:'custom', name, roles, params }` 改为 `{ type:<customType>, ...config }`。`roles` 上移到 definition，因为它是坐标系固有投影契约，不应每个 op 重复声明。`options.coordinates` 从 Record 形态改为 `Array<CoordinateDefinition>`，对齐 transform / scale definitions。

IR schema 继续保持静态单一真源：内置 coordinate 是闭合 union；未知非内置 type 通过 passthrough custom op 接纳，并在 lowering 期用对应 definition schema 精确校验。custom passthrough 必须排除内置 type，避免吞掉内置坐标系的静态 schema 错误。

## 实现指针

- `CoordinateDefinition.resolve(op, ctx)` 产出 `frame + plotArea + gridLayers + axisLayers`。
- `CoordinateResolveContext` 暴露坐标系无关共享能力，如 role value 收集、scale 解析、position scale 构建与 guide lowering。
- locator 与 lowering 必须复用同一 registry 和 `resolveFrame` 通道，保证命中与渲染 parity。
- 内置 definition 可在包内复用 layout helper；公开 context 不暴露 cartesian / polar / ternary 专属布局函数。

## 影响

- ⚠️ BREAKING：`options.coordinates` / `<Plot coordinates>` 从 Record 改为 Array。
- ⚠️ BREAKING：删除 `PlotCoordinate.Custom` 与旧 `{type:'custom',name,roles,params}` 形态。
- `@retikz/plot` 公开 `defineCoordinate`、`CoordinateDefinition`、`CoordinateResolveContext`、`CoordinateResolution`、`CoordinateOp`。
- core IR 不变；coordinate 只消费并产出 plot runtime frame。

## 不在本 ADR 范围

- 不新增具体长尾坐标系。
- 不把高级 layout helper 纳入公开 context。
- 不支持自定义覆盖内置 coordinate；type 冲突直接抛错。
- 不设计跨运行时 portable definition 注册中心。

> 🔖 本文件压缩前完整施工蓝图 = `git show 20392fb1f39f0383e9d8f8a29f31850da99b8825:_notes/decisions/graph/v0/v0.1/alpha.12/05-coordinate-registry.md`（封板全文）。
