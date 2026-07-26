# ADR-03：单轴路径连接

- 状态：Accepted
- 决策日期：2026-07-23
- 接受日期：2026-07-26
- 关联：[alpha.1 roadmap](./roadmap.md) · [v0.5 roadmap](../roadmap.md) · [Drawing Complete](../../../../architecture/core-drawing-complete.md)

## 背景

`|-` / `-|` 表达先后沿两个轴到达目标的两段正交折线。用户只想从当前点水平连接到目标 x，或垂直连接到目标 y 时，现有 fold 必然多发一段；流程图又常用 `-|-` / `|-|` 在连接中间插入一条可调位置的垂直或水平段。parser 没有 namespace，无法在 authoring 阶段把命名 target 预计算为投影点或转折点。

现有 target union、path host resolver、fold step 和 line command 足以承载引用、anchor 与最终渲染。缺口分别是一个在 compile 时根据当前 cursor 投影终点的闭合 step，以及 fold 家族内可表达两处转折的严格变体。

## 决策

### Kernel step

新增：

```ts
type IRAxisLineStep = {
  type: 'step';
  kind: 'axis-line';
  axis: 'horizontal' | 'vertical';
  to: IRAxisLineTarget;
  label?: IRStepLabel;
};

const AxisLineTargetSchema = z.union([PositionSchema, NodeTargetSchema]);
type IRAxisLineTarget = z.infer<typeof AxisLineTargetSchema>;
```

- `axis` 必填，无默认值；schema 为 strict object。
- `AxisLineTargetSchema` 是 target 边界的单一真源；公开 `IRAxisLineTarget` 必须由它推导。Way operator 与 React props 只消费该派生类型，不另写平行 union。
- horizontal endpoint 为 `[resolvedTarget.x, current.y]`。
- vertical endpoint 为 `[current.x, resolvedTarget.y]`。
- target 闭合为 Cartesian position 或 NodeTarget，不接受 polar / relative / relativeAccumulate / offset-position / between。target reference 按以下固定顺序解析：
  1. Cartesian position 直接作为当前 host 局部坐标；
  2. Node / Coordinate / Scope target 先查 namespace；无 `anchor` 时固定取中心，即使只给 `boundary` 或 `offset` 也不启用 toward clipping；
  3. 有标准 / 数字 `anchor` 时以 `boundary ?? node.boundary` 调用现有 anchor resolver；
  4. `offset` 在世界坐标叠加到 reference，随后经累计 Scope transform 反投影到当前 host 局部坐标；
  5. 最后才按 axis 与 current reference 组合 projected endpoint。
- target 端隐式 auto-boundary clipping 对 axis-line 始终禁用，projected endpoint 是固定终点。source 端使用 projected endpoint 作为 `toward` 调用既有 `clipForTarget(previous.step.to, projectedEndpoint, ...)`；只有现有 `isAutoBoundaryTarget(previous.step.to)` 为真时，source provenance / arrow boundary inset 标志才为真。存在 shape pen override 时直接以 override 为 source，不再对旧 target 重复裁剪。axis-line target 端的 auto-boundary / arrow inset 标志始终为 false。
- path 编译把“几何 current reference”和“relative baseline”作为同一 runtime cursor state 的两个显式字段，不再让 axis-line 依赖预先猜测的 endpoint：
  - 普通绝对 target 更新 relative baseline；普通 relative 以 baseline 计算固定点但不更新 baseline；relativeAccumulate 以 baseline 计算并更新 baseline；
  - arc / circlePath / ellipsePath / rectangle / smooth / generator 仍按既有规则产生 pen override；axis-line 紧随这些 step 时，current reference 优先取实际 pen override，否则取上一普通 target 的已解析 anchor；
  - axis-line 先解析 target reference，再以 current reference 投影和 source clip、发出 line、完成 label / mark sampling；成功后清除旧 pen override，并把 projected endpoint 同时写为几何 current reference、上一普通 fixed target 与 relative baseline；
  - axis-line 后的 relative / relativeAccumulate 因而都以 projected endpoint 为 baseline；普通 relative 完成后只推进绘制 pen，不推进 baseline，relativeAccumulate 同时推进二者；
  - 下一普通绝对 target、curve、fold、smooth 或 generator 消费 projected endpoint 时，把它视为固定 Cartesian source；`cycle` 仍闭合到最近 move target，不改 relative baseline。
- 为实现上述状态转移，relative target resolution 与 axis projection 必须在 step 被消费时按声明顺序完成；不得继续由一次性 eager `normalizePathSteps` 为 axis-line 后续 target 猜测结果。现有非 axis 路径的可观察 relative、shape pen override 与 warning 语义保持不变。
- 零长度 axis-line 合法，沿现有 line emitter 的零长度输出规则处理，不 warning。
- 最终只产生既有 move / line Scene path command；renderer、Scene path contract 和 sampling primitive 不新增 kind。

### Fold 扩展

`kind: 'fold'` 保持为正交折线的唯一 Kernel step 家族，并按 `via` 冻结为严格变体：

```ts
type IRFoldStep = z.infer<typeof FoldStepSchema>;

// FoldStepSchema 对应的公开结构：
type IRFoldStepShape =
  | {
      type: 'step';
      kind: 'fold';
      via: '-|' | '|-';
      to: IRTarget;
      label?: IRStepLabel;
    }
  | {
      type: 'step';
      kind: 'fold';
      via: '-|-' | '|-|';
      fraction?: number;
      to: IRTarget;
      label?: IRStepLabel;
    };
```

- `-|-` 按 horizontal → vertical → horizontal 发出三段；`|-|` 按 vertical → horizontal → vertical 发出三段。
- `fraction` 是闭区间 `0..1` 的归一化位置，仅三段变体允许；省略时 compile 使用 `0.5`，两段 `-|` / `|-` 携带该字段会被 strict schema 拒绝。
- 转折点基于裁剪前 source / target reference 计算：`-|-` 的共同 x 为 `sx + (tx - sx) * fraction`；`|-|` 的共同 y 为 `sy + (ty - sy) * fraction`。`0` 与 `1` 合法，允许首段或末段退化为零长度。
- `FoldStepSchema` 是结构单一真源，公开 `IRFoldStep` 必须由它推导；schema 自身不写入默认 `fraction`，只由 compile 在消费省略值时取 `0.5`。
- clipping 在 reference 路由 `[source, ...corners, target]` 上选方向：source 朝后查找第一个不与 source reference 重合的点，target 朝前查找最后一个不与 target reference 重合的点；shape pen override 继续直接作为 source。若整条 reference 路由只有同一点，则沿用既有零长度 target 行为。
- 裁剪后，所有与 source reference 连续重合的前导转折点替换为 source clip，所有与 target reference 连续重合的尾随转折点替换为 target clip；这使 `fraction=0/1` 的端部退化腿在最终命令中仍为零长度，又不会发出 boundary → center 的穿节点线段。其它转折点不因端点裁剪重新插值。
- 编译按顺序发出处理后的两个转折点与裁剪后的 target，Scene / renderer 仍只接收既有 line command。
- step label sampler 把规范化 `t` 均分给各段：两段 fold 各占 `1/2`，三段 fold 各占 `1/3`，不按物理长度分配。`t=1/3`、`2/3` 等分界点归前一腿，与既有两段 fold 的 `t=0.5` 一致；被选腿为零长度时，tangent 取最近的非零腿，等距时优先前一腿，整条路由零长度才回退 `[1, 0]`。path-level marks 仍沿最终 commands 采样。
- rounded-corners 沿用既有 fold provenance：fold 内转折保持尖角，fold 外其它可参与的 line-line 接缝不受影响；三段 fold 不新增圆角分支。

### Way sugar

```ts
type WayAxisLineOp = { horizontalTo: IRAxisLineTarget | string } | { verticalTo: IRAxisLineTarget | string };
type WayFoldOp = { via: '-|-' | '|-|'; fraction?: number };
```

`parseWay` 使用现有 `parseTargetSugar` 后立即用 `AxisLineTargetSchema` 验证并转换为 `axis-line`。字符串只允许解析后得到 Cartesian position 或 NodeTarget；`+x,y`、`++x,y` 等 relative shorthand，以及 polar / offset-position / between 结果以 `parseWay:` 诊断 fail-loud，禁止 cast 或产出 schema-invalid IR。对象不得同时含 `horizontalTo` 与 `verticalTo` 或其它 Way operator；冲突对象 fail-loud。

Way 裸 token `-|-` / `|-|` 消费后继 target 并使用默认 `fraction`；需要配置时使用 `{ via: '-|-', fraction: 0.3 }` 或 `{ via: '|-|', fraction: 0.3 }`。配置对象是 strict parser object：只允许 `via` / `fraction`，立即执行与 Kernel schema 相同的 `via` 与闭区间校验；拼错或多余字段、非法 `via` 均以 `parseWay:` fail-loud。该对象作为单个 infix operator 参与多 operator 冲突检测。既有裸 token `-|` / `|-` 保持不变，不增加对象形式。

React `Draw` 与 Vanilla `path()` 继续共享 `WayDSL` / `parseWay`，不实现 adapter 私有投影。React 显式 Kernel step 新增：

```ts
type AxisLineStepProps = {
  kind: 'axis-line';
  axis: 'horizontal' | 'vertical';
  to: IRAxisLineTarget | string;
  label?: IRStepLabelInput;
  children?: ReactNode;
};
```

builder 在 `parseTargetSugar` 后执行 `AxisLineTargetSchema` validation；unbuilder 保留 `axis` / `to` / `label`；`Draw` 把 parseWay 产出的 axis-line 显式映射为等价 `<Step kind="axis-line" ... />`。必须验证 Draw → IR 与 IR → React → IR 两条等价链。Vanilla helper 无产品逻辑改动，但必须用正式测试证明 `path()` 消费同一 `WayDSL` / `parseWay` 结果。

React `FoldStepProps` 同步使用严格 union：`-|` / `|-` 不接受 `fraction`，`-|-` / `|-|` 接受可选 `fraction`。builder、unbuilder 与 `Draw` 必须保留显式值和字段省略状态；Vanilla 继续直接共享 Core parser。

### 引用、坐标系与错误

- “horizontal / vertical” 在当前 path host 的局部坐标系定义；nested Scope 的 rotate / scale 由现有 host global↔local target resolver处理。因此视觉画布上的方向可以随 Scope transform 旋转。
- Node / Coordinate / Scope target 与 path 既有 pending emit 生命周期一致，后置 target 可在 Scope children 闭合后成功解析。
- path 尚未建立 current point 时，沿现有 `PATH_TOO_SHORT` 诊断跳过整条 path。
- target 最终未定义时发 `UNRESOLVED_NODE_REFERENCE` 并跳过整条 path，不退回 `[0,0]`。
- 非 finite target、world→local 结果或 projected endpoint 立即 fail-loud，不发出任何部分 path command。
- `|-` / `-|` 的两段 fold 几何、clipping 与 sampling 语义完全不变。
- rounded-corners 将 axis-line lower 后的 segment 当作普通 line 参与 line-line 圆角。command provenance 保留 `axis-line`，但 line eligibility 明确接受 `line | axis-line`；step label sampler 使用 source clip → projected endpoint 的真实 segment，path-level marks 沿最终 commands 采样。

## DSL

```tsx
<Draw way={[[0, 0], { horizontalTo: { id: 'target', anchor: 'center' } }, { verticalTo: [160, 96] }]} />
<Draw way={[[0, 0], { via: '-|-', fraction: 0.3 }, 'target']} />
<Step kind="fold" via="|-|" fraction={0.6} to="target" />
```

结构化 IR：

```ts
{
  type: 'step',
  kind: 'axis-line',
  axis: 'horizontal',
  to: { id: 'target', anchor: 'left', offset: [-4, 0] },
}
```

## 被否决的方案

- parser 直接计算投影坐标：parser 无 namespace、Scope transform 或最终 Node layout。
- 新 target kind：单轴语义依赖 current cursor，是 path operation，不是独立 target。
- 把 fold 的第二段设为零长度：仍会污染 cursor、label、mark、sampling 和 provenance 语义。
- renderer 增加 horizontal / vertical command：Scene 已能用普通 line 精确表达。
- 新增 `mid-fold` step kind：两段与三段仅是同一正交 fold 家族的 `via` 变体，拆 kind 会复制 target、clipping、sampling 与 adapter 契约。
- 用百分数字面量或 `50` 表示中间位置：与现有归一化参数习惯不一致，也不利于直接插值。
- step registry：这是成对、闭合、确定性的基础几何操作，没有第三方算法 dispatch 或 fallback。

## 公开影响

- `IRStep` 与 `WayDSL` 包含 `axis-line` / horizontalTo / verticalTo，并扩展 fold `via` 与 Way fold operator；TypeScript exhaustive consumer 必须覆盖这些分支。本仓 React builder / unbuilder / Draw 与 docs codegen / schema registry 已同步更新。
- 两段 `|-` / `-|`、普通 line、target auto-clip 和 delayed path 使用原有生命周期；auto-clip 禁用只属于 axis-line。
- JSON round-trip 保留结构化 step；sugar 只存在 authoring parser。

## 最终实现与验证摘要

- Core `IRStep` 新增 strict `axis-line`，并把同一 fold family 扩展为两段 / 三段 `via`；Scene 仍只输出既有 move / line command。
- target lookup、host-local 轴投影、cursor / relative baseline、source clipping、sampling、marks、label、rounded corner 与 provenance 共用同一最终 path state。
- Way parser、React `Step` / `Draw`、builder / unbuilder 与 Vanilla plain spec 保留同一结构化 IR、默认值和失败语义。
- Step、Way、path schema / parser reference、双语 controls 与 demo 已同步。
- 正式验证覆盖 schema、parser、compile、geometry、adapter 与 docs，包括 delayed target、non-finite、零长度、Scope transform、三段 fold fraction / clipping / sampling 等反例。

## 遗留边界

- 不提供自动正交路由、避障、通用约束求解或数据坐标投影。
- 不自动选择 `via` / `fraction`，也不支持任意次数转折。
- 普通 target 的隐式 clipping 语义保持不变；axis-line 的 target 不启用 toward auto-clip。
