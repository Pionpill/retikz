# ADR-04：Node label `rotate`（label 文本绕自身中心自旋 + 修 rotated-Node label 坐标空间）

- 状态：Accepted
- 决策日期：2026-05-23
- 关联：[v0.2-alpha.4 plan §B-3 + §待定 0](../../../plans/v0/v0.2-alpha.4.md) · [v0 roadmap §Node label 旋转能力计划](../../../plans/v0/roadmap.md#node-label-旋转能力计划) · [本 milestone ADR-03 文本 Node 包 g](./03-text-node-group-wrap.md)（同走 emit 末端 GroupPrim transform）· [v0.1-alpha.4 ADR-03 node label](../v0.1-alpha.4/03-node-label.md)（label 定位算法来源）

## 背景

`Node.label` 当前只按 `position`（8 方向 / 数字角度）+ `distance` 算标签中心点，**文本本身恒为水平**。环绕式标注（沿径向写说明、环形刻度）写不出来——例如 `position: 'left'` 只把标签放左侧，不会把文字转到沿径向。

同时存在一个 **latent bug**：`labelCenter`（`compile/node.ts`）经 `anchorOf` → `shapeDef.anchor(layout.rect, ...)` → `rect.anchor` 走 `localToWorld(r, ...)`，对 `layout.rect.rotate !== 0` 的节点返回**已旋转的世界坐标**；而 emit 把 label TextPrim 放进 `inner`，`inner` 又被 Node 外层 rotate group 包一层（[ADR-03](./03-text-node-group-wrap.md) 后带文本节点必走 group）→ label 位置**被绕 node center 旋转两次**。alpha.4 之前就有，因无"旋转 Node + label"的精确位置断言而未暴露。

加 label 自旋必须先解决这个坐标空间问题——否则"自旋"会叠在"位置双重旋转"的错误基线上。故本 ADR 的核心决策是**坐标空间**，自旋模式是其上的增量。

## 选项

> 核心分歧：rotated Node 上 label 的位置 / 自旋在**哪个坐标空间**计算。不旋转 Node（`rect.rotate === 0`，`localToWorld` 退化恒等）三方案等价、无差异——分歧只在 rotated Node。

### A. `labelCenter` 改用 axis-aligned rect（局部坐标），位置 + 自旋都进 `inner`，外层 Node rotate group 统一旋转一次（**推荐**）

```ts
// labelCenter 用未旋转的 layout 调用 anchorOf / angleBoundaryOf 两个分支：
const aaLayout = { ...layout, rect: { ...layout.rect, rotate: 0 } };
// 8 方向：anchorOf(aaLayout, anchorName)        ← 原走 anchorOf(layout, ...)
// 数字角度：angleBoundaryOf(aaLayout, position)  ← 原走 angleBoundaryOf(layout, ...)
// → 两个分支都拿局部坐标；label 自旋 group（绕局部 label 中心）也在 inner 内
// → inner 整体被外层 Node rotate group 旋转一次：位置 + 自旋 + node 角度天然叠加
```

- **两个 position 分支都要改**：`labelCenter` 的 8 方向分支走 `anchorOf`、数字角度分支走 `angleBoundaryOf`，**二者都内部消费 `layout.rect.rotate`**（`anchorOf`→`rect.anchor`→`localToWorld`；`angleBoundaryOf` 自己用 `rect.rotate` 旋转 toward 并对 rotated rect 求 boundaryPoint）。只修 8 方向会漏掉 `position: 30` 这类数字角度、rotated Node 上仍双重旋转。修法是 `labelCenter` 用 `aaLayout`（rotate=0）调这两个 helper——**不改 `anchorOf` / `angleBoundaryOf` 本身**（它们供 path anchor `'A.north'` / `'A.30'` 落点仍需 rotated rect）。
- **顺带修掉双重旋转**：label 位置只被 Node 外层 group 转一次，回归"位置由 position / distance 决定、Node 旋转带着它转"的正确语义。
- **自旋自然叠加**：label 在局部空间绕自身中心自旋，外层再施加 node 角度——视觉等价"node 角度 + label 自旋角"，无需额外补偿。
- **代价**：**改变现有 rotated-Node 的 label 位置**（这是修复，不是回归）——需 snapshot review + 在变更日志显式声明"修正 rotated-Node label 位置双重旋转"。不旋转 Node 零变化。

### B. 保留 `labelCenter` 世界坐标，label rotate group 挂到外层 transform 已应用之后的空间

label 不进 `inner`，单独挂在 Node group **之外**，用 `labelCenter` 算出的世界坐标定位 + 自旋。

- 缺：**破坏"label 跟 Node 一起旋转"的既有语义**（label 脱离 node group）；与 [ADR-02](./02-explicit-zindex.md) "Node 整体作 stacking 单位"冲突（label 跑到 node 单位外）；且没真正解决双重旋转，只是把 label 挪出旋转链。

### C. 不修双重旋转，只在不旋转 Node 上支持 `rotate`

rotated Node 上 label `rotate` 行为不保证（维持现状的双重旋转）。

- 缺：留一个"rotated Node + label 位置错"的坑；用户在旋转节点上加 label rotate 会得到莫名其妙的位置。把已知 bug 写进契约，不可接受。

## 决策：A

理由：

1. **一次修两件事**：本来就要为 label 自旋动 emit；顺手把 latent 的双重旋转修了，避免"自旋叠在错误位置基线上"。
2. **语义自洽**：局部坐标 + 外层统一旋转，与 shape / text 的处理（emit 用 axis-aligned rect、rotate 由外层 group 统一施加）**完全一致**——label 不再是特例。
3. **不旋转 Node 零影响**：`rect.rotate === 0` 时 `localToWorld` 恒等，A 与现状逐字节相同；行为变化严格限定在 rotated Node（且是修复）。
4. **B / C 都不可取**：B 破坏既有语义且不真修；C 把已知 bug 固化进契约。

## 待决策点

> 选项 A 已选，以下细节拍板。

- **`rotate` 取值**：`'none' | 'radial' | 'tangent' | number`。`none` / 缺省 = 水平（兼容 v0.1）；`radial` = 沿 node 中心→label 中心方向；`tangent` = radial + 90°；`number` = 显式度数（屏幕 y-down：0°=+x、90°=+y）。
- **角度计算**：方向向量取 `[lx, ly] − [cx, cy]`（label 中心 − node 中心），`radial = atan2(ly−cy, lx−cx)`。**在选项 A 选定的局部坐标空间内计算**——node 自身角度由外层 group 叠加，`resolveLabelRotateDeg` 不重复计入。
- **`keepUpright`**（可选 boolean，缺省 false）：true 时若自旋后文字会倒置（偏离正立 > 90°）则翻 180° 保阅读方向。阈值用 `90 < norm < 270`（norm = 角度归一化到 `[0,360)`）；恰好 90° / 270°（垂直）不翻。边界归属（≥90 vs >90）的临界外观留实现期微调，倾向 `>90`（垂直时不翻）。
- **旋转中心 = label 自身中心 `[lx, ly]`**（非 node 中心）：位置仍由 `position` / `distance` 决定，`rotate` 只改朝向、不二次位移 label。
- **schema 默认不写死**：`rotate` 字段缺省（optional），不在 schema 显式写 `'none'` 默认值；文档注明"缺省 = none = 水平"。

## DSL 表面

```tsx
{/* 沿径向写说明：左侧标签转到沿"中心→左"方向 */}
<Node position={[0, 0]} text="O" label={{ text: 'radius', position: 'left', rotate: 'radial' }} />

{/* 环形刻度：切向自旋 + 保持正立可读 */}
<Node position={[0, 0]} text="" label={{ text: '30°', position: 30, rotate: 'tangent', keepUpright: true }} />

{/* 手动角度 */}
<Node position={[0, 0]} text="N" label={{ text: 'note', position: 'above', rotate: -15 }} />
```

## 测试设计

`packages/core/tests/compile/node-label-rotate.test.ts` 覆盖：

- `rotate` 缺省 / `'none'` → label 不包 rotate group
- 数字 → 包绕**自身中心**的 rotate group（旋转中心 = label TextPrim 坐标）
- `radial`（`position:'right'` → ≈0°）/ `tangent`（→ ≈90°）
- `keepUpright`（`position:'left'` radial≈180 → 翻到 ≈0）
- **rotated Node + label 位置不漂移不变量**（核心修复验证）：见象限

具体 case 见"实现契约 § 测试象限"。

## 影响

- **`packages/core/src/ir/node.ts`**：`NodeLabelSchema` 加 `rotate?: 'none'|'radial'|'tangent'|number`（`z.union([z.enum([...]), z.number()])`）+ `keepUpright?: boolean`。
- **`packages/core/src/compile/node.ts`**：`NodeLabelLayout` 加 `rotate` / `keepUpright`；`layoutNode` label 标准化透传；`labelCenter` 用 axis-aligned layout（`rect.rotate=0`）调 **`anchorOf`（8 方向）与 `angleBoundaryOf`（数字角度）两个分支**（**选项 A，修双重旋转——两分支都要改，否则 `position: N` 数字角度漏修**）；emit label 循环按自旋角度包 rotate GroupPrim；加 `resolveLabelRotateDeg` + `RAD_TO_DEG`。**不改 `anchorOf` / `angleBoundaryOf` 本身**（path anchor `'A.north'` / `'A.30'` 仍需 rotated rect）。
- **React**：`label` prop 整体透传 `IRNodeLabel`（`builder` / `unbuilder` 走整体赋值）→ `rotate` / `keepUpright` 随 `IRNodeLabel` 进出，**React 端零改动**。
- **⚠️ 行为修正（非 breaking schema，但改输出）**：rotated Node（`rotate !== 0`）上 label 位置从"双重旋转"修正为"单次旋转"——既有 rotated-Node + label 的快照会变；变更日志显式声明这是 latent bug 修复。不旋转 Node 零变化。
- **文档站**：Node label 文档加 `rotate` / `keepUpright` 段（含 radial / tangent / keepUpright 示意）；schema reference 同步；更新日志注明 rotated-Node label 位置修正。

## 不在本 ADR 范围

- **label 提供"相对屏幕固定朝向"（抵消 Node 旋转）选项**：当前 node 角度 + label 自旋天然叠加；"固定朝向"是另一种诉求，YAGNI，留未来按需。
- **StepLabel（path 边标注）的 rotate**：本 ADR 只动 Node label；StepLabel 自旋是独立诉求，未来段。
- **显式 zIndex** → [ADR-02](./02-explicit-zindex.md)；**带文本 Node 包 `<g>`** → [ADR-03](./03-text-node-group-wrap.md)。

---

## 实现契约（必填）

### Level

`red`

- 动 `packages/core/src/ir/**`（NodeLabelSchema）+ `packages/core/src/compile/**`（node.ts）。
- 跨级取最高 = red。

### Schema 改动

| 文件 | 操作 | 字段名 | 类型 | 默认值 | describe 中文摘要 |
|---|---|---|---|---|---|
| `packages/core/src/ir/node.ts` | 加 | `rotate`（NodeLabelSchema） | `z.union([z.enum(['none','radial','tangent']), z.number()]).optional()` | — (缺省 = none / 水平) | label 文本绕自身中心自旋：none / radial（径向）/ tangent（切向）/ 数字度数 |
| `packages/core/src/ir/node.ts` | 加 | `keepUpright`（NodeLabelSchema） | `z.boolean().optional()` | — (缺省 false) | 自旋后若文字倒置（偏离正立 >90°）则翻 180° 保可读 |

### 文件 scope

- `packages/core/src/ir/node.ts`（修改：NodeLabelSchema 加 rotate / keepUpright）
- `packages/core/src/compile/node.ts`（修改：NodeLabelLayout + layoutNode 透传 + labelCenter 改 axis-aligned rect + emit 包 rotate group + resolveLabelRotateDeg）
- `packages/core/tests/compile/node-label-rotate.test.ts`（新建）
- `packages/core/tests/compile/node-label.test.ts`（可能修改：若有 rotated-Node + label 的位置断言，按修正后值更新；纯 findLabel 递归用例零改动）
- `packages/core/tests/compile/__snapshots__/*.snap`（更新：含 rotated-Node + label 的快照）
- `apps/docs/src/contents/**`（修改：Node label 文档 + schema reference + 更新日志）

偏离白名单需加条目自注解或开新 ADR。

> 快照更新逐条核对：不旋转 Node 的 label 快照应**零变化**（守卫 A 的"不旋转零影响"）；只有 rotated-Node + label 的快照变化，且变化方向符合"双重旋转 → 单次旋转"的修正。

### 测试象限

`packages/core/tests/compile/node-label-rotate.test.ts`，≥ 9 case：

**Happy path（≥ 3）**：

- `rotate_undefined_no_rotate_group`：`label:{text:'L'}` → 不存在包住 L 的 rotate group
- `rotate_number_wraps_group_around_label_center`：`label:{text:'L', position:'right', rotate:30}` → 包 L 的 group `transforms[0]` = `{kind:'rotate', degrees:30, cx:txt.x, cy:txt.y}`（中心 = label 自身）
- `radial_right_approx_zero`：`{position:'right', rotate:'radial'}` → degrees ≈ 0
- `tangent_right_approx_ninety`：`{position:'right', rotate:'tangent'}` → degrees ≈ 90
- `numeric_position_radial_no_double_rotation`（**覆盖数字角度分支**）：`{position:30, rotate:'radial'}` 在 `rotate:0` 与 `rotate:θ` Node 上——经 `angleBoundaryOf` 分支算的 label 世界坐标，旋转版 = 非旋转版绕 node center 转一次 θ（守卫数字角度分支也走了 axis-aligned，没漏修）

**边界（≥ 2）**：

- `rotate_none_explicit_no_group`：`rotate:'none'` 与缺省等价 → 不包 group
- `keepUpright_flips_left_label`：`{position:'left', rotate:'radial', keepUpright:true}`（radial≈180）→ 归一化后接近正立（≈0 / 360）
- `keepUpright_false_keeps_inverted`：同上但 `keepUpright:false` → degrees 保持 ≈180（不翻）

**错误路径（≥ 2）**：

- `invalid_rotate_string_rejected`：`NodeLabelSchema.parse({ text:'L', rotate:'spin' })` → throw（enum 不含 'spin'）
- `keepUpright_non_boolean_rejected`：`{ text:'L', keepUpright:'yes' }` → throw

**交互（≥ 2，含核心修复）**：

- `unrotated_node_label_position_locked`：不旋转 Node 上 label（`rotate:'none'`）的 TextPrim 坐标用**硬编码 expected**锁定（按 position/distance 几何 + fallbackMeasurer 确定值算出的具体数值，自包含可执行——不写"与改造前逐字节相等"那种拿不到改造前实现的目标）。**另**：既有 `node-label.test.ts` 的不旋转用例（`position='above' → y<-10`、`position='right' → x>10`、数字角度等）零改动通过，作为"A 不影响不旋转 Node"的回归守卫。
- `rotated_node_label_no_double_rotation`（**核心**）：同一 label（`position:'right', distance:10`）放在 `rotate:0` 与 `rotate:θ` 的 Node 上，把 label TextPrim 坐标经其外层 group transform 还原到世界坐标后，旋转版 = 非旋转版世界坐标绕 node center 旋转**一次** θ（不变量自包含、可执行，不依赖改造前实现）
- `node_rotate_plus_label_rotate_compose`：Node `rotate:θ` + label `rotate:φ` → label 最终视觉朝向 = θ + φ（外层 group θ 叠加内层 label group φ）
- `text_node_label_rotate_inside_node_group`（与 ADR-03 交互）：带文本 Node 的 label rotate group 嵌在该 Node 的外层 `<g>` 内

### 依赖的现有元素

- `packages/core/src/compile/node.ts` 的 `labelCenter` —— **修改**：两个分支（`anchorOf` 8 方向 / `angleBoundaryOf` 数字角度）都改用 axis-aligned layout（`rect.rotate=0`）调用，修双重旋转。
- `packages/core/src/compile/node.ts` 的 `anchorOf` / `angleBoundaryOf` —— **仅引用、不改**：二者内部都消费 `layout.rect.rotate`（`anchorOf`→`rect.anchor`→`localToWorld`；`angleBoundaryOf` 自己旋转 toward 并对 rotated rect 求 boundaryPoint）；它们供 path anchor `'A.north'` / `'A.30'` 仍需 rotated rect，**保持不变**，仅由 `labelCenter` 传入 axis-aligned layout 规避双重旋转。
- `packages/core/src/compile/node.ts` 的 `NodeLabelLayout` / `layoutNode` label 标准化 —— **扩展**：透传 `rotate` / `keepUpright`。
- `packages/core/src/compile/node.ts` 的 `emitNodePrimitives` label 循环 —— **修改**：按自旋角度包 rotate GroupPrim。
- `packages/core/src/geometry/rect.ts` 的 `rect.anchor` / `_transform.localToWorld` —— **引用**：对 rotated rect 走 `localToWorld` 是双重旋转根因；A 通过 `labelCenter` 传 axis-aligned layout 规避。
- `packages/react/src/kernel/{Node,builder,unbuilder}` 的 `label` 透传 —— **仅引用**：`IRNodeLabel` 整体进出，新字段随之，React 零改动。
- [本 milestone ADR-03](./03-text-node-group-wrap.md) —— **协同**：带文本 Node 必走外层 group，label rotate group 嵌其内。
