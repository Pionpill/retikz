# core dashOffset 能力补全请求

> 状态：已完成。core Path / Node / Scene 侧已经具备稳定 `dashOffset` 能力，plot 后续实现 guide line style 时应直接复用。
> 来源：plot axis line 进阶几何设计时发现，axis line 需要对齐常见图表库的 dashed domain line 能力。

## 背景

`@retikz/core` 目前已经有通用 `dashPattern` 与 `dashOffset`，并能从 Path / Node IR 编译到 Scene。plot 的 axis line、grid line、mark path、node border 等都可以复用这组描边能力。

但常见图表 / 可视化库会把 dash offset 作为完整线条样式的一部分。例如 axis domain line、grid line、reference line 在使用虚线时，用户有时需要调整虚线起点，让多条线的虚线节奏对齐，或避免端点处出现不完整短 dash。

早期 core 里只有 Canvas animation 内部会使用 `lineDashOffset` 做路径绘制动画，那不是 IR / Scene 的稳定契约。现在 core 已经把 `dashOffset` 提升为稳定 JSON-safe 字段，上层包可以作为普通描边样式消费。

## 已有能力

core 已补齐稳定的 stroke dash offset 能力，语义上与 `dashPattern` 配套：

```ts
{
  dashPattern?: Array<number>;
  dashOffset?: number;
}
```

当前契约：

- `dashOffset` 是 JSON-safe number，单位与 path user units 一致。
- `dashOffset` 只在有 stroke / dashed rendering 时生效；没有 `dashPattern` 时可以保留但无可见效果。
- core schema 允许有限 number，正负值都可表达。
- 字段命名使用 `dashOffset`，与现有 `dashPattern` 对齐；renderer 输出时再映射为 SVG `stroke-dashoffset` / Canvas `lineDashOffset`。
- 能力应是 core 通用描边能力，不是 plot axis 专用字段。

## 已确认影响面

当前代码中已经能看到这些落点：

- `packages/kernel/core/src/schemas/path/path/schema.ts`：Path IR 已有 `dashOffset`。
- `packages/kernel/core/src/schemas/node/schema.ts`：Node leader / border 已有 `dashOffset`。
- `packages/kernel/core/src/contract/scene/path.ts`：Scene Path primitive 已有 `dashOffset`。
- `packages/kernel/core/src/contract/scene/{rect,ellipse,marker}.ts`：Scene 可描边 primitive 已有 `dashOffset`。
- `packages/kernel/core/src/compile/path/stroke/emit.ts`：Path lowering 已透传 `dashOffset`。
- `packages/kernel/core/src/compile/node/**`：Node layout / outline / pin 已透传 `dashOffset`。

## 与 plot 的关系

plot 不需要另造 axis line 专用 `dashOffset`。plot 侧应把 `dashOffset` 加入 `GuideLineStyleSchema` / theme line style，并让 axis line、tick line、grid line、legend 可描边部件自然透传。

plot ADR-05 的 axis line advanced geometry 仍聚焦 `lineCap`、`extent`、`arrow`、`origin placement`。`dashOffset` 不属于 axis line 结构能力，而应作为 ADR-02 `GuideLineStyleSchema` 的普通线条样式字段进入 plot。

## 建议测试方向

plot 接入时可考虑：

- guide schema 接受 `dashPattern + dashOffset`，拒绝非 number / NaN / Infinity。
- axis line、tick line、grid line 和 legend 可描边部件能透传 `dashOffset`。
- theme line style 可以默认 `dashOffset`，local guide line style 可以覆盖。
- 未设置 `dashPattern` 但设置 `dashOffset` 时，plot 只透传字段，不额外报错。

## 非目标

- 不要求改变现有 `dashPattern` 语义。
- 不要求新增 dashed / dotted shorthand。
- 不要求把 `dashOffset` 设计成 axis line 的结构字段。
