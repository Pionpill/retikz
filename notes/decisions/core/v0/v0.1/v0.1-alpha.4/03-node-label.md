# ADR-03：Node `label` 边挂标签

- 状态：Accepted
- 决策日期：2026-05-10
- 关联：[v0 roadmap §v0.1.0-alpha.4](../../roadmap.md) · [tikz-gap-analysis §1 P2](../../../../../analysis/2026-05-07-tikz-gap-analysis.md)

## 背景

TikZ 用 `[label=above:foo]` 在节点边界外挂额外文字，常见用途：

- 节点编号 / 引脚标记（电路图）
- UML 关联端的多重性 / 角色名
- 流程图节点旁的备注
- 几何图标记角点 / 边长

支持多个 label（重复 `[label=...]`）、不同方向、自定义距离与样式。

retikz alpha.3 没有这套——想实现"在节点旁加一个 'foo' 标签"得拆成两个 IR：本节点 + fake 文本节点（用 stroke=transparent 的 Node 包文字）。问题：

1. 拆出去的文本节点需要单独算位置，与原节点失去关联——原节点 rotate / scale 后标签不会跟着动
2. AI 生成 / TikZ codec 反推时无法识别"这是个 label"
3. 原节点 nodeIndex 注册的是本身位置，标签算锚点也得自己手算

alpha.4 把它升级为 Node 的一等字段。

## 选项

### A. 嵌入 `Node.label?: NodeLabel | Array<NodeLabel>`（**推荐**）

```ts
type NodeLabel = {
  text: string;
  position?: AtDirection | number;  // 8 方向枚举或角度
  distance?: number;
  textColor?: string;
  opacity?: number;
  font?: IRFont;
};

type Node = { /* ...原字段 */ label?: NodeLabel | Array<NodeLabel> };
```

- label 跟 node 是从属关系，平级 child 反而失去约束
- 与 alpha.3 ADR-04 边标注（嵌入 `Step.label`）保持一致风格
- 编译期：layoutNode 阶段标准化 + 继承样式，emitNodePrimitives 末尾追加 TextPrim
- node rotate / scale 时 label 跟着动（同 group 旋转）

### B. 平级 IRChild kind `'node-label'`

```ts
type IRChild = IRNode | IRPath | IRCoordinate | IRNodeLabel;
type IRNodeLabel = { type: 'node-label'; nodeId: string; text: string; ... };
```

- label 与 node 平级，靠 ref 字段绑定
- 缺点：label 与 node 的从属关系靠字符串引用维持——AI 生成 IR 时容易写出"孤儿 label"（nodeId 不存在）
- 也丢失了"label 跟着 node transform"的天然性

### C. label 是 sugar `<Label>` 子组件

```tsx
<Node id="A" position={[0, 0]}>
  A
  <Label position="above">foo</Label>
</Node>
```

- DSL 直观
- 但 IR 仍要决定 label 怎么存（回到 A / B 的选择）；React 只是表面糖
- 可以作为 alpha.5 的 sugar 增强，本版先做底层的 prop 形态

## 决策：A（嵌入 Node 字段）

理由：

1. **从属关系正确**——label 是 node 的视觉附属，IR 上明确表达从属
2. **transform 自动跟随**——label TextPrim 放进 emitNodePrimitives 的 inner 列表，rotate ≠ 0 时整组 wrap 进 group（label 与 node 一起旋转）
3. **样式继承自然**——layoutNode 阶段已经知道 node.font / textColor，label 缺字段直接继承同一处变量
4. **与 alpha.3 ADR-04 边标注对齐**——边标注嵌在 `Step.label`，节点标签嵌在 `Node.label`，两者命名 / 形态对称

DSL 表面（数组形态多 label）：

```tsx
<Node
  id="A"
  position={[0, 0]}
  label={[
    { text: '上', position: 'above' },
    { text: '右上', position: 'above-right', distance: 6 },
    { text: '30°', position: 30 },
  ]}
>A</Node>
```

## position 表达：8 方向 ∪ 数字角度

8 方向枚举：与 ADR-01 `at.direction` 完全相同的 `AT_DIRECTIONS` 常量；视觉语义对齐。

数字角度：用 union `z.union([z.nativeEnum(AT_DIRECTIONS), z.number()])`；对应 TikZ `label=30:foo`。

- 角度约定：与 polar 一致（0° = +x east，90° = +y screen-down）
- 实现：`angleBoundaryOf(layout, angle)` 取角度方向边界点，沿 (cos, sin) 单位向量再外推 distance

## 默认 distance

`DEFAULT_LABEL_DISTANCE = 4`（user units）。

TikZ 默认是 0pt（label 紧贴 border），但视觉上太贴了，retikz 给一个小气孔。可以通过 `label.distance` 覆盖。

`<Tikz>` 容器没有 `labelDistance` prop——alpha.4 暂不需要全局控制；如果未来有诉求再加。

## 多 label 支持

`label?: NodeLabel | Array<NodeLabel>`：

- 单对象简记 = 数组长度 1
- 数组：每条独立位置 / 样式
- 编译期 layoutNode 把单对象标准化为数组
- emit 阶段循环 emit 一个 TextPrim per label

## 样式继承规则

| 字段 | 继承策略 |
|---|---|
| `font.size` | 缺省 → `node.font.size`，再缺省 → renderer 默认 |
| `font.family` / `weight` / `style` | 缺省 → `node.font.*` |
| `textColor` | 缺省 → `node.textColor`，再缺省 → currentColor |
| `opacity` | 不继承（label 独立透明度），缺省 → `node.opacity` |
| `distance` | 不从 node 继承（节点没有这个语义），缺省 → 4 |

继承在 layoutNode 阶段完成；emit 端只处理算好的 NodeLabelLayout。

## label 与 viewBox

alpha.4 暂不让 label 参与 viewBox 扩展——理由：

- label 文字宽度需要 measureText，labelLayout 阶段没有调用 measureText（避免与 node text measurement 耦合复杂度）
- 测试场景 label 通常贴近 node，distance ≤ 10，超出 node bbox 不多
- 如果用户 label 位置极端（distance=100），可以手动加 padding 或 fake 一个 node 占位

下版（alpha.5+）可以补上 label 的精确 measurement + bbox 扩展。

## 测试

`packages/core/tests/compile/node-label.test.ts` 覆盖：

- 基本生成（单对象 / 数组）
- 8 方向位置算法（above / below / right）
- 数字角度（0 / 90）
- position 缺省 = 'above'
- 样式继承（font 字段级 / textColor）
- 节点 rotate 时 label 在 group 内一起转

12 个 case 全过。

## 影响

- `packages/core/src/ir/node.ts`：新增 `NodeLabelSchema` + `IRNodeLabel`，`NodeSchema` 加 `label?` 字段
- `packages/core/src/compile/node.ts`：`NodeLayout` 加 `labels?: Array<NodeLabelLayout>`，layoutNode 标准化，emitNodePrimitives 末尾 emit
- `packages/react/src/kernel/Node.tsx`：`NodeProps.label?` 新增
- `_builder.ts` / `_unbuilder.ts`：透传 label 字段

不影响：

- 现有 path label（alpha.3 ADR-04 边标注）——独立模块，命名空间不冲突
- 其它节点字段
- viewBox 算法

## 不在本 ADR 范围

- TikZ `pin`：label 的孪生兄弟（路径风格变体），alpha.4 不做
- label 的复杂 anchor 控制（`label.anchor=south west`）：alpha.4 用居中即可
- multi-line label：label.text 限定 string，不接 array；后续如果 demand 再升
- label 自身也能挂 label（`label of label`）：YAGNI
