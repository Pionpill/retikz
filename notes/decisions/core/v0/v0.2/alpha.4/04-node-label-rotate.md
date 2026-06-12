# ADR-04：Node label `rotate`（label 文本绕自身中心自旋 + 修 rotated-Node label 坐标空间）

- 状态：Accepted（已实现）
- 决策日期：2026-05-23
- 关联：[v0.2-alpha.4 plan §B-3 + §待定 0](./roadmap.md) · [v0 roadmap §Node label 旋转能力计划](../../roadmap.md#node-label-旋转能力计划) · [本 milestone ADR-03 文本 Node 包 g](./03-text-node-group-wrap.md)（同走 emit 末端 GroupPrim transform）· [v0.1-alpha.4 ADR-03 node label](../../v0.1/alpha.4/03-node-label.md)（label 定位算法来源）

> **范围**：让 `Node.label` 文本能绕自身中心自旋（沿径向 / 切向 / 显式角度），并修掉一个 latent 的 rotated-Node label 坐标空间双重旋转 bug。核心决策是**坐标空间**，自旋模式是其上的增量。

## 背景 / 约束

塑造方案的硬约束：

- `Node.label` 原只按 `position` + `distance` 算标签中心点，**文本本身恒为水平**——环绕式标注（沿径向写说明、环形刻度）写不出来。
- 存在 **latent bug**：`labelCenter` 经 `anchorOf → rect.anchor → localToWorld` 对 `rect.rotate !== 0` 的节点返回**已旋转的世界坐标**，而 emit 把 label TextPrim 放进 `inner`、`inner` 又被 Node 外层 rotate group 包一层（ADR-03 后带文本节点必走 group）→ label 位置**被绕 node center 旋转两次**。alpha.4 之前就有，因无「旋转 Node + label」的精确位置断言而未暴露。
- 加 label 自旋必须先解决坐标空间问题，否则「自旋」会叠在「位置双重旋转」的错误基线上。

## 决策：`labelCenter` 改用 axis-aligned rect（局部坐标），位置 + 自旋都进 `inner`，外层统一旋转一次（选项 A）

`labelCenter` 用未旋转的 `aaLayout`（`rect.rotate = 0`）调 `anchorOf`（8 方向分支）与 `angleBoundaryOf`（数字角度分支）**两个分支** —— 二者都内部消费 `layout.rect.rotate`，只修 8 方向会漏 `position: 30` 这类数字角度、rotated Node 上仍双重旋转。**不改 `anchorOf` / `angleBoundaryOf` 本身**（path anchor `'A.north'` / `'A.30'` 落点仍需 rotated rect）。label 在局部空间绕自身中心自旋，外层 Node rotate group 统一旋转一次——位置 + 自旋 + node 角度天然叠加。

理由：

1. **一次修两件事**：本来就要为 label 自旋动 emit，顺手把 latent 双重旋转修了，避免「自旋叠在错误位置基线上」。
2. **语义自洽**：局部坐标 + 外层统一旋转，与 shape / text 的处理（emit 用 axis-aligned rect、rotate 由外层 group 统一施加）**完全一致**，label 不再是特例。
3. **不旋转 Node 零影响**：`rect.rotate === 0` 时 `localToWorld` 恒等，A 与现状逐字节相同；行为变化严格限定在 rotated Node（且是修复）。

具体决策细节（设计意图）：

- **`rotate` 取值 `'none' | 'radial' | 'tangent' | number`**：`none` / 缺省 = 水平（兼容 v0.1）；`radial` = 沿 node 中心→label 中心方向；`tangent` = radial + 90°；`number` = 显式度数（屏幕 y-down：0°=+x、90°=+y）。
- **角度计算**：方向向量取 `[lx,ly] − [cx,cy]`（label 中心 − node 中心），`radial = atan2(ly−cy, lx−cx)`，**在局部坐标空间内算**——node 自身角度由外层 group 叠加，不重复计入。
- **`keepUpright`**（可选 boolean，缺省 false）：true 时若自旋后文字倒置（偏离正立 > 90°）翻 180° 保阅读方向；阈值 `90 < norm < 270`（norm 归一化到 `[0,360)`），垂直（恰 90° / 270°）不翻。
- **旋转中心 = label 自身中心 `[lx, ly]`**（非 node 中心）：位置仍由 `position` / `distance` 决定，`rotate` 只改朝向、不二次位移。
- **schema 默认不写死**：`rotate` 字段 optional，不在 schema 显式写 `'none'` 默认值；文档注明「缺省 = none = 水平」。
- **React 端零改动**：`label` prop 整体透传 `IRNodeLabel`，`rotate` / `keepUpright` 随之进出。

### 被否决的选项

- **B：保留 `labelCenter` 世界坐标，label rotate group 挂到 Node group 之外** —— label 脱离 node group，破坏「label 跟 Node 一起旋转」的既有语义；与 ADR-02「Node 整体作 stacking 单位」冲突（label 跑到 node 单位外）；且没真正解决双重旋转，只是把 label 挪出旋转链。
- **C：不修双重旋转，只在不旋转 Node 上支持 `rotate`** —— 留一个「rotated Node + label 位置错」的坑，把已知 bug 写进契约，不可接受。

## 不在本 ADR 范围

- **label 提供「相对屏幕固定朝向」（抵消 Node 旋转）选项**：当前 node 角度 + label 自旋天然叠加；「固定朝向」是另一种诉求，YAGNI，留未来。
- **StepLabel（path 边标注）的 rotate**：本 ADR 只动 Node label；StepLabel 自旋独立诉求，未来段。
- **显式 zIndex** → [ADR-02](./02-explicit-zindex.md)；**带文本 Node 包 `<g>`** → [ADR-03](./03-text-node-group-wrap.md)。

---

> **实现指针**：level `red`（动 `core/src/ir/node.ts` 的 `NodeLabelSchema` + `core/src/compile/node.ts`），**非 schema breaking 但改输出**——rotated Node（`rotate !== 0`）上 label 位置从「双重旋转」修正为「单次旋转」，既有 rotated-Node + label 快照会变（变更日志显式声明 latent bug 修复），不旋转 Node 零变化。真源以代码为准——`NodeLabelSchema.rotate`（`z.union([z.enum(['none','radial','tangent']), z.number()]).optional()`）/ `keepUpright`（`core/src/ir/node.ts`）、`labelCenter` 改用 axis-aligned layout 调两分支 + `resolveLabelRotateDeg` + emit 包 rotate GroupPrim（`core/src/compile/node.ts`，`anchorOf` / `angleBoundaryOf` 本身不改）；React `label` 整体透传零改动。测试在 `core/tests/compile/node-label-rotate.test.ts`（缺省 / none 不包 group / 数字绕自身中心 / radial≈0 / tangent≈90 / 数字角度分支无双重旋转 / keepUpright 翻转 / schema 拒非法 rotate 与非 boolean keepUpright / 不旋转位置锁定 / rotated 无双重旋转核心不变量 / node+label 角度叠加 / 嵌在文本 Node 外层 g 内），既有 `node-label.test.ts` 不旋转用例零改动通过。完整原文（选项代码 / 决策细节 / DSL 示例 / 测试象限 9+ case / 文件 scope / 依赖元素）见本文件 git 历史。

> 🔖 封板压缩 commit `a21a9d6b`；压缩前完整施工蓝图 = `git show a21a9d6b^:notes/decisions/core/v0/v0.2/alpha.4/04-node-label-rotate.md`。
