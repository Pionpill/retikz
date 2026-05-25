# ADR-01：Node `at` 节点间相对定位

- 状态：Accepted
- 决策日期：2026-05-10
- 关联：[v0 roadmap §v0.1.0-alpha.4](../../roadmap.md) · [tikz-gap-analysis §1 P1](../../../../../analysis/tikz-gap-analysis.md)

## 背景

retikz alpha.1~alpha.3 的 Node 只能用绝对笛卡尔 `[x, y]` 或极坐标 `{ angle, radius, origin? }` 定位。两者都要算坐标——画"流程图三个 step 横向均分"得手算 `[0, 0]`、`[3, 0]`、`[6, 0]`。

TikZ 的 `positioning` library 提供更易读的相对定位语法：

- `\node[right=2cm of A] (B) {...};`：B 中心在 A 中心右侧 2cm 处
- `\node[above right=of A] (C) {...};`：C 中心在 A 右上对角，距离 = `node distance` 默认值
- `\tikzset{node distance=1.5cm}`：设全局 `node distance` 默认值

alpha.4 必须把这套补上，让用户写图时只需描述节点关系而非坐标。

## 选项

### A. IR 嵌入相对定位 + 编译期解析（**推荐**）

```ts
type Position = [number, number] | PolarPosition | AtPosition;
type AtPosition = { direction: AtDirection; of: string; distance?: number };
type AtDirection = 'above' | 'below' | 'left' | 'right'
                  | 'above-left' | 'above-right' | 'below-left' | 'below-right';
```

- IR 保留用户原始意图（`{ direction: 'right', of: 'A' }`），编译期 resolvePosition 折成笛卡尔
- 跟 alpha.3 polar 设计同模式（polar 进 IR、`compile.ts` resolvePosition 解析）
- DSL 层：`<Node position={{ direction: 'right', of: 'A', distance: 2 }}>`
- nodeDistance 通过 `<Tikz nodeDistance={1.5}>` 注入 CompileOptions，再传给 resolvePosition；`distance` 自带值优先，缺省回退到 nodeDistance，再缺省回退到 1

### B. React DSL 即时解析，不进 IR

- builder 在收 children 时同步算成 `[x, y]` 写进 IR
- IR 始终干净，下游不需要知道相对定位
- 缺点：丢失意图，TikZ codec 反推时拿不回原始 `[right=2cm of A]`；编辑器 / AI 生成的 IR 也只能看到死坐标

### C. 单独 `at` IR 字段（不进 position union）

```ts
type Node = {
  position?: Position | PolarPosition;
  at?: { direction, of, distance? };  // 与 position 互斥
  // ...
};
```

- 字段名直观（`at` 一看就懂）
- 但需要 zod 表达 xor，要么用 `z.union([NodeWithPos, NodeWithAt])`（重复 30+ 字段），要么运行时校验
- IR 字段语义裂开，AI 生成 / codec 处理多一种 case

## 决策：A（嵌入 position union）

理由：

1. **跟 alpha.3 polar 模式对称**——alpha.3 已经把 polar 进 IR、编译期解析，相对定位是同样问题，沿用同样设计减少认知负担
2. **意图保留 + 单字段**——一个 `position` 字段承担三种形态，IR JSON 紧凑；codec / 编辑器 / AI 不需要分辨"用的是 position 还是 at"
3. **判别简洁**——`'direction' in pos` 一眼识别 AtPosition；`Array.isArray` 识别笛卡尔；其余是 PolarPosition

DSL 表面：

```tsx
<Tikz nodeDistance={2}>
  <Node id="A" position={[0, 0]}>A</Node>
  <Node id="B" position={{ direction: 'right', of: 'A' }}>B</Node>
  <Node id="C" position={{ direction: 'right', of: 'B', distance: 3 }}>C</Node>
</Tikz>
```

- `<Tikz nodeDistance>` 是 prop（注入 CompileOptions）
- `<Node position={{ direction, of, distance? }}>` 直接接受 AtPosition 形态

## 8 方向 vs 4 方向

选 8 方向（4 主向 + 4 对角）。

- TikZ `positioning` library 也是 8 方向
- 4 对角分量为 `1/√2`——保证斜向距离与水平/垂直距离等长（对角点位于 distance 半径的圆周上），与 TikZ 行为一致
- 视觉语义：`above` 在视觉上方（retikz y 减小，TikZ y 增大；语义在两边一致）

## 默认 distance 优先级

```
node.distance > Tikz.nodeDistance prop > 1 (硬编码默认)
```

跟 TikZ `node distance=1cm` 类似（TikZ 默认 1cm，retikz 默认 1 user unit）。

## of 引用允许什么

- alpha.4：仅 node id（同 polar `origin` 字符串、Step `to` 字符串引用）
- alpha.4 N2 落地后：自动允许 coordinate id（coordinate 也注册到 nodeIndex）
- 前向引用拒绝（`of` 必须先在 IR 中出现），与 polar `origin` / Step 字符串目标一致

## 测试

`packages/core/tests/compile/node-at.test.ts` 覆盖：

- 8 方向单位向量（4 主向 × 验位置；2 对角 × 验对角分量等长）
- distance 优先级：node 自带 / nodeDistance 上下文 / 默认值
- 链式 at（B at A，C at B）
- of 引用未定义 / 前向引用都抛错
- 与 path 端点引用混用：at 不破坏 nodeIndex 注册

13 个 case 全过。

## 影响

- `IRPosition` / `PolarPosition` 之外多一种 `IRAtPosition` 形态——`packages/core/src/ir/position/at-position.ts` 新增
- `CompileOptions` 新增 `nodeDistance?: number`
- `<Tikz>` 新增 `nodeDistance` prop
- `resolvePosition` 多一个 `'direction' in pos` 分支；其它形态行为不变

## 不在本 ADR 范围

- `<Coordinate>` 占位节点（ADR-02 处理）
- Node `label` 边挂标签（ADR-03 处理）
- TikZ `node distance=1cm and 1cm`（横/纵不同距离）：TikZ 高级用法，alpha.4 暂不支持，留到 v0.2
