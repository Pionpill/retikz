# ADR-03：修正 `point` 公开面 —— `toPolar` / `equalPolar` 迁 `polar`

- 状态：Accepted（设计已拍板，待实现）
- 决策日期：2026-06-13（拆分重写 2026-06-14）
- 关联：[ADR-01 math 包 + 首切 API](./01-math-package-and-geometry-api.md) · [ADR-02 core 纯几何下沉](./02-core-pure-geometry-sink.md) · [alpha.1 roadmap](./roadmap.md) · core `geometry/{point,polar}.ts`

> **范围**：一处用户可见的公开面 breaking 修正——把 `point.toPolar` / `point.equalPolar` 移出 `point`、内联进 `polar`。单列成 ADR，因为它是 [ADR-02](./02-core-pure-geometry-sink.md)「公开面逐字不变」的**唯一例外**（主动 breaking），且需文档同步。

## 背景 / 约束

- [ADR-01](./01-math-package-and-geometry-api.md) 的 `@retikz/math` 是零-IR 包；`point.toPolar` 返回 `PolarPosition`、`point.equalPolar` 接受 `PolarPosition`——`PolarPosition`（origin 可为节点 id 字符串）是 **IR 类型**，不能进 math。故 math 的 `point` 必须不含这两方法。
- 代码核验（2026-06-14）：生产代码中 `point.toPolar` / `point.equalPolar` **仅被 `polar.ts` 调用**——`polar.fromPosition` 委托 `point.toPolar`、`polar.equal` 委托 `point.equalPolar`。即真实现住在 `point`、`polar.*` 是别名（委托方向恰好反了）。其余生产文件零调用，调用集中在测试。
- 0.x「正确设计为准、不为兼容旧写法留别名 / 桥」。

## 决策

- **实现反向内联进 `polar`**：`polar.fromPosition` 直接算 `atan2` / `hypot`；`polar.equal` 直接做 precision 取整比较（原 `point.equalPolar` 函数体）。
- **从 core 的 `point` 移除 `toPolar` / `equalPolar`**——`@retikz/core` 公开 `point` 自此不含这两方法（用户可见 breaking）。
- 调用方迁 `polar.*`：`polar.fromPosition`（替 `point.toPolar`）、`polar.equal`（替 `point.equalPolar`）；测试同步迁移。
- **不留兼容层**：不做 `point = { ...mathPoint, toPolar, equalPolar }` 包一层（0.x 不留桥）。
- **文档同步**：`apps/docs` 中引用 `point.toPolar` / `equalPolar` 的页面改写为 `polar.fromPosition` / `polar.equal`（双语，zh 为真源）。

## 被否决的选项

- **`point = { ...mathPoint, toPolar, equalPolar }` 包一层保面**：保留旧公开面但 core 的 `point` ≠ math 的 `point`（身份分裂），且把 IR 牵连的方法重新挂回 point、与「point 纯化」目标矛盾。0.x 不值得为此留桥。

## 不在本 ADR 范围

- math 包 / point 向量运算下沉——[ADR-01](./01-math-package-and-geometry-api.md) / [ADR-02](./02-core-pure-geometry-sink.md)。

---

> **实现指针**：level `red`（公开面 breaking：`@retikz/core` 的 `point` 去两方法）。breaking 但 0.x 接受。文件 scope：core `geometry/polar.ts`（内联实现）、`tests/geometry/{point,polar}.test.ts`（toPolar / equalPolar case 迁 polar、删别名等价断言）、`apps/docs`（point 公开面变化双语同步）。验收：全仓 `pnpm lint` + 各包 `tsc --noEmit` 无 `point.toPolar`/`equalPolar` 残留调用。逐步骤见 [alpha.1 roadmap TODO-3](./roadmap.md)。
