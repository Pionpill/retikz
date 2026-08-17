# ADR-03：单轴路径连接

- 状态：Accepted
- 决策日期：2026-07-23

## 背景

现有 fold 只能表达两段正交折线；用户还需要只沿 x 或 y 连接 target，以及在两处转折间插入可调位置的中间段。Parser 没有 namespace，投影和转折必须在 compile 时基于当前 cursor 与已解析 target 完成

## 决策

新增严格 Kernel step：

```ts
type IRAxisLineStep = {
  type: 'step';
  kind: 'axis-line';
  axis: 'horizontal' | 'vertical';
  to: Position | NodeTarget;
  label?: IRStepLabel;
};
```

Horizontal endpoint 为 `[target.x, current.y]`，vertical endpoint 为 `[current.x, target.y]`。Target 只接受 Cartesian position 或 NodeTarget；Node / Coordinate / Scope target 按既有 namespace、anchor、boundary 和 offset 解析，offset 在世界坐标叠加后反投影到 host local。axis-line target 端始终禁用隐式 auto-boundary clipping；source 端可使用 projected endpoint 做既有 clip

Path cursor 同时保存 geometric current reference 与 relative baseline：axis-line 成功后把 projected endpoint 写入二者并清除旧 pen override；之后 relative / relativeAccumulate 依照既有 baseline 规则运行。零长度 axis-line 合法，最终只生成普通 move / line command，renderer、Scene path contract 和 sampling 不新增 kind

`fold` 仍是正交折线唯一 step family。`via` 为 `-|`、`|-`、`-|-` 或 `|-|`；三段变体可带 `fraction`，省略时为 `0.5`，值为闭区间 `0..1`。`-|-` 依次 horizontal → vertical → horizontal，`|-|` 依次 vertical → horizontal → vertical；两段变体携带 fraction 必须被 strict schema 拒绝。转折基于裁剪前 source / target reference 插值，端部退化腿允许零长度但不能生成穿过节点的错误线段

Path label sampler 对两段 / 三段按腿数均分 `t`，边界归前一腿；零长度腿取最近非零腿，等距优先前一腿，整路由零长度才回退 `[1, 0]`。Path-level marks 仍沿最终 commands 采样，fold 内转折保持既有尖角 provenance

Way sugar 新增 `horizontalTo` / `verticalTo` 与带 `via`、可选 `fraction` 的三段 fold object。`parseWay` 先解析 target sugar，再用同一 schema 验证；relative shorthand、polar、between、冲突字段和未知字段 fail-loud。React Draw / Step 与 Vanilla path 共享 parser 和派生类型，不建立 adapter 私有投影

## 行为、失败语义与兼容性

尚未建立 current point、target 未定义、非 finite 坐标或不可解析 reference 时沿既有 path 诊断跳过整条 path或同步 fail-loud，不退回 `[0,0]`。普通 line、两段 fold、target delayed lifecycle、auto-clip 和 rounded-corners 的既有语义保持；axis-line 的 target auto-clip 禁用只作用于新 step

## 最终结果与遗留边界

Core、Way、React、Vanilla 已共享 axis-line 与严格 fold union，Scene 仍只包含既有 line command。不提供自动正交路由、避障、通用约束求解、数据投影或任意次数转折
