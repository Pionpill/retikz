# v0.1.0-alpha.4 实施方案

> 写于 2026-05-10。完工即删（git 历史还在）。
>
> 关联：[v0-roadmap §v0.1.0-alpha.4](./v0-roadmap.md) · [tikz-gap-analysis](../analysis/2026-05-07-tikz-gap-analysis.md) · [DESIGN.md](../architecture/DESIGN.md)

## 主题：节点关系定位 + 顶层完善

alpha.1 / alpha.2 / alpha.3 把 Node 视觉表达 + Path 几何能力补到了"主流流图够用"。alpha.4 转向**节点之间的关系**（相对定位、命名占位点、节点附属标签），让用户写图时少算坐标、少拆假节点。

完工后能直接复刻 TikZ `positioning` library 的常用模式：`(B) [right=2cm of A]`、`\coordinate (m) at (3,2);`、`(A) [label=above:foo]`。

## 衡量标准

- IR schema 三组新字段（Node `at` / `<Coordinate>` IR / Node `label`）全部有 `.describe(...)` 英文契约 + zod 派生类型
- 三个 ADR 落地、状态从 Proposed → Accepted
- 每条改动有等价性测试（DSL 表面与 Kernel JSX 同语义）+ 编译期定位测试
- 文档站每个 Node / Path 当前 prop 在对应 mdx 章节里都有 API 表格行 + `<ComponentPreview>` 示例
- alpha.3 已发布的能力（曲线三件套 / path-shape / 相对坐标 / 边标注）跑等价性回归无破坏

---

## 改动拆分

### N1 — Node `at` 节点间相对定位

TikZ 等价：`\node[right=2cm of A] (B) {...}`。

**ADR-0001（待写）**：节点间相对定位的 IR 表达
- 选项 A：保留在 IR（`Node.at?: { dir, of, distance? }`），编译期 resolvePosition 折成笛卡尔（沿用 alpha.3 polar 的"原始意图入 IR、编译期解析"模式）
- 选项 B：仅 React DSL prop，builder 同步算成 `position`，不进 IR
- 倾向 A：保留意图利于 codec / 编辑器 / AI 生成时的可读性；解析复杂度集中在编译期一处

**待决策点**：
- `at.dir` 集合：4 方向（above / below / left / right）→ 8 方向（再加 above-left / above-right / below-left / below-right）；TikZ `positioning` 是 8 方向
- `at.of` 类型：仅 node id 字符串 → 还是允许 coordinate id（N2 落地后自然可行）
- `at.distance` 缺省值：从 Tikz 容器 prop `nodeDistance?: number` 取（参 TikZ `node distance=1cm`），未配则硬编码默认（如 1）
- `at` 与 `position` 互斥还是共存：discriminated union 强制只能填一个

**Step 拆分**：
- step.1：IR schema —— `Node` 的 `position` 改成 union `Position | PolarPosition | { at: { dir, of, distance? } }`；写 zod + 派生类型
- step.2：compile —— `resolvePosition` 增加 `at` 分支：找 `nodeIndex.get(of)` 的中心 + dir 单位向量 × distance；前向引用要求 of 节点先出现（与 polar `origin` 一致）
- step.3：React DSL —— `<Node>` 增加 `at` prop（discriminated union 在 props 上落实为 `position?` xor `at?`）
- step.4：Tikz 容器加 `nodeDistance?: number` 上下文 prop（默认值来源），通过 `CompileOptions` 传到 compile

### N2 — `<Coordinate>` 占位节点

TikZ 等价：`\coordinate (m) at (3,2);`——命名一个点不画任何图形，让后续 path 用 `to: 'm'` 引用。

**ADR-0002（待写）**：占位节点的 IR 表达
- 选项 A：新加 `IRChild` kind `coordinate`（`{ type: 'coordinate', id, position }`，无形状字段）；compile 不发任何 primitive，但进 nodeIndex
- 选项 B：复用 `Node` 加 `invisible: true` 标记
- 倾向 A：discriminator 正交，IR 看一眼就知道是占位；schema 字段更少、AI 生成时不需要分辨"哪些 Node prop 在 invisible 时无效"

**待决策点**：
- coordinate 在 path target 解析里的 `boundaryPoint`：直接返回中心（无形状边界），还是 fallback 到 prevEnd 方向 0 的伪边界
- `<Coordinate>` 是否允许 `at`（N1 的相对定位）：建议允许，对称才对
- coordinate 之间能否互相 `at` 引用：建议允许，nodeIndex 统一收

**Step 拆分**：
- step.1：IR schema —— 新增 `CoordinateSchema`，`IRChild` union 加上
- step.2：compile —— `nodeIndex` 收 coordinate；`resolveTarget('m')` / `at.of='m'` 都能命中；不发 primitive
- step.3：React DSL —— 新增 `<Coordinate id="..." position={...} />` kernel 组件（kernel/Coordinate.tsx），builder 识别 displayName

### N3 — Node `label?` 边挂标签

TikZ 等价：`\node[label=above:foo] (A) {...}`——在 node 边界外挂一个文字，可以多个。

**ADR-0003（待写）**：节点附属标签的 IR 表达
- 选项 A：嵌入 `Node.label?: NodeLabel | Array<NodeLabel>`（IR 字段，编译期翻译成 TextPrim）
- 选项 B：新增 `IRChild` kind `node-label`（与 node 平级，靠 ref 字段绑定）
- 倾向 A：label 跟 node 是从属关系，平级 child 反而失约束；与 alpha.3 ADR-0004 边标注（嵌入 `Step.label`）保持一致风格

**待决策点**：
- `position` 表达：方向枚举 `'above' | 'below' | 'left' | 'right' | 'above-left' | ...`（与 N1 dir 对齐）+ 数字角度 `number`（TikZ `label=30:foo` 表示中心 30° 方向）—— 用 union
- 多 label：支持单对象 + 数组形态；单对象简记为长度 1 的数组
- distance：标签与 node 边界的距离，缺省 `outerSep + 一个 hardcoded gap`
- 样式继承：font / textColor 不填时从 Node 继承 → 还是独立默认；建议从 Node 继承（alpha.3 边标注同样设计）
- DSL：仅 prop 形态，sugar `<Label>` 子组件留到下一版按需求再加（YAGNI）

**Step 拆分**：
- step.1：IR schema —— `NodeLabelSchema`（text / position / distance? / textColor? / fillOpacity? / font?），`Node.label?: union(NodeLabel, Array<NodeLabel>)`
- step.2：compile —— 在 `compileNode` 末尾按 label 列表追加 TextPrim；位置 = node 边界外 dir 方向 × (outerSep + distance)；继承 font 从 Node
- step.3：React DSL —— `<Node label={...}>` prop 透传

### D1 — 文档站补齐 Node / Path 全 prop 演示页

apps/docs/src/contents 现状：
- `core/components/node/`：`overview` / `text`
- `core/components/draw/`：`overview` / `path` / `step`

补齐目标：

**Node**
- `overview` 章节：保持当前总览结构，按 alpha.4 实现进度补 `at` / `label` / `<Coordinate>` 章节小段落 + 跳转链接
- 新增 `core/components/node/positioning/`：聚焦 `at` 相对定位 + Tikz `nodeDistance` 上下文 prop（含 demo）
- 新增 `core/components/node/label/`：节点附属标签 prop 的全形态演示（单对象 / 数组 / 多方向 / 数字角度）
- `core/components/node/text` 章节中已覆盖的 prop 不重复

**Coordinate（新组件）**
- 新增 `core/components/coordinate/overview/`：作为 kernel 第三个组件（与 Node / Path 平级）

**Path / Draw / Step**
- 既有页面的 API 表格 / demo 检查：alpha.3 末追加的 P2 三件视觉属性（`opacity` / `fillOpacity` / `drawOpacity`）有没有都进文档；缺则补
- alpha.3 引入但未单独演示的：曲线三件套 / path-shape / 相对坐标 / 边标注；如有遗漏一并补

**侧栏 / 导航**：`apps/docs/src/data/sidebar*.ts` 同步加新章节条目

**双语并行**：每页 `index.zh.mdx` + `index.en.mdx` 必须同时落地；zh 是 source of truth

### T1 — 测试覆盖加固

- N1 N2 N3 各自的 IR schema 解析测试（合法 + 非法）
- N1：编译期相对定位解析测试（4 方向 / 8 方向 / 自定义 distance / nodeDistance 上下文继承）
- N2：coordinate 在 path target 中被引用的全场景（move / line / arc / circlePath ...）
- N3：label 渲染位置测试（4 方向 + 角度）+ 样式继承测试
- 等价性测试：每个新 sugar 形态（如有 `<Label>`）配 `expect(buildIR(<Sugar/>)).toEqual(buildIR(<Kernel/>))`

---

## 颗粒度 / commit 顺序建议

每条改动一个 step 一个 commit。整体顺序：

1. ADR-0001 起草（N1 设计文档）
2. N1.step1 → N1.step2 → N1.step3 → N1.step4
3. ADR-0001 完工：标 Accepted + 同步 roadmap
4. ADR-0002 起草
5. N2.step1 → N2.step2 → N2.step3
6. ADR-0002 完工
7. ADR-0003 起草
8. N3.step1 → N3.step2 → N3.step3
9. ADR-0003 完工
10. D1 文档：每个新章节一组 zh+en 一个 commit
11. T1 测试加固（如有遗漏补丁）
12. alpha.4 收尾：roadmap 打勾 + reference/overview 版本号 alpha.3 → alpha.4 + 清理本 plan

每个 step 都遵循 AGENTS.md 的"等用户审阅 → commit"流程；不豁免 task 之间的检查点。

## 风险 / 待确认

- **N1 与现有 polar `origin`**：polar 已有 `origin?: string | Position | PolarPosition`，跟 `at: { of, dir, distance }` 表达力部分重叠（极坐标可以 `{ angle, radius, origin: 'A' }` 模拟）。决策：保留两套——polar 是任意角度 + 半径的极坐标；`at` 是 8 方向枚举的语义糖，AI 生成 / 用户写时各有取舍
- **N1 默认 distance**：硬编码 1（user units）vs Tikz 上下文 `nodeDistance` 注入。决策：用上下文，缺省回退到 1
- **N3 label 的样式继承深度**：font 全继承容易，opacity 是否继承（label 视觉上独立于 node 边界）需要在 ADR-0003 决策时定
- **`<Coordinate>` 在 builder 的位置**：在 React kernel/ 还是 sugar/？倾向 kernel/（与 Node / Path 平级，直接对应 IR）
- **alpha.4 完工后**：删本 plan（plans/ 完工即删），把 4 个 alpha.4 ADR 内容总结进 changelog，adr/ 目录给 alpha.5 重新编号

---

## 不在本版本范围

按 v0-roadmap，下面这些留给 v0.2 / v0.3 / 后续：

- `<Scope>` / `<Group>` 嵌套样式继承（v0.2）
- `intersections` / `calc`（v0.3）
- `pin`（label 的孪生兄弟，路径风格变体；按需推迟）
- 节点 / 路径 `transform`（rotate / shift / scale 整体变换；超出本版主题）
