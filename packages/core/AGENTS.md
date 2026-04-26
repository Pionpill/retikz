# @retikz/core 工作指南

> 本文档是 `@retikz/core` 包内特有的规范。
> - 项目通用规则（commit / JSDoc / IR schema 风格 / 数组写 `Array<T>` 等）见根 [`AGENTS.md`](../../AGENTS.md)
> - 架构与重构方案见 [`docs/DESIGN.md`](../../docs/DESIGN.md) / [`docs/CORE-REFACTOR.md`](../../docs/CORE-REFACTOR.md)

---

## 硬约束（CI 守门）

- **不准 `import 'react'` / `import 'react-dom'`**——所有 React 内容属于 [`@retikz/react`](../react/)
- **不准依赖 DOM API**（`document` / `window` / `canvas` / `HTMLElement` 等）——浏览器特化能力由 adapter 通过依赖注入提供
- **运行时依赖白名单**：当前只有 `zod`；新增任何运行时依赖必须在 PR 描述里写明理由
- **所有可能进 IR 的数据 100% JSON 可序列化**——禁止函数 / ref / closure / class 实例进 IR 类型

## 几何模块（`geometry/`）

### 坐标系

- 笛卡尔 `[x, y]`：x 向右增长，y 向下增长（与 SVG / Canvas 一致，与数学课本相反）
- 单位是 **user units**，不是像素；最终物理单位由 SVG `viewBox` / Canvas 缩放决定

### 极坐标进 IR，但只在 Scene 编译时解析为笛卡尔

- `geometry/polar.ts` 提供 `PolarPosition` 类型（含递归 `origin?: string | Position | PolarPosition`）+ `polar` 工具集（`toPosition` / `fromPosition` / `offsetFrom`）
- `ir/polar-position.ts` 提供 `PolarPositionSchema`（用 `z.lazy` 处理递归），允许 polar 进入 IR
- **IR 中接受 polar 的位置字段**：
  - `Node.position`：`Position | PolarPosition`
  - `Step.to`：`Position | PolarPosition | string`（string 是节点 id 引用）
  - `PolarPosition.origin`：`string | Position | PolarPosition`（可嵌套，可引用节点 id）
- **极坐标的解析时机：Scene 编译阶段**
  - `compile.ts` 的 `resolvePosition()` 把所有 polar 形态折成笛卡尔
  - 所有下游（renderer / 几何运算）只看到笛卡尔，无需知道 polar 存在
  - 字符串 origin 解析依赖 nodeIndex，因此节点必须按依赖顺序定义（前向引用要求被引用节点先出现，与 TikZ 一致）
- **理由**：
  - polar 在 IR 保留用户原始意图，对 TikZ 双向 codec / 编辑器"显示原始输入" / AI 生成径向图非常友好
  - 解析集中在 Scene 编译一处，下游复杂度只增加在该处
  - SVG / Canvas / Skia / PDF 底层仍是笛卡尔，Scene primitive 保持笛卡尔即可

### 形状的 `x, y` 表示几何中心

**所有 2D 形状类型的 `x, y` 字段表示形状的几何中心，不是边界角点。**

- `Rect.x` / `Rect.y` = 矩形几何中心
- 未来 `Circle.x` / `Circle.y` = 圆心
- 未来 `Ellipse.x` / `Ellipse.y` = 椭圆中心
- ……

理由：

- 与 IR `Node.position` 语义一致——TikZ 节点定位的是中心
- 不同形状类型保持一致的位置语义，避免心智割裂
- 操作上"在某点放一个东西"是常见心智，center 是天然锚点
- 渲染输出层（`scene/primitives.ts` 的 `RectPrim` / 未来 `CirclePrim` 等）保持各形状原生的 SVG 位置约定（`<rect>` 用左上角，`<circle>` 用 `cx/cy`）。**坐标转换发生在 emit primitive 时，不污染上游几何代码。**

### 纯函数 + plain data，不用 class

- 几何工具一律用纯函数 + 普通对象，**不写 class**——理由见 docs/CORE-REFACTOR.md / 历史讨论
- 函数集合用 `const xxx = { method1, method2 }` 命名空间形态
- 每个方法独立 JSDoc（见根 AGENTS.md "对象字面量当命名空间"规则）

## Scene 编译器（`scene/`）

- `ScenePrimitive` 是矢量图形的最大公约子集
  - 禁止 SVG-only 特性（`<filter>` / `<marker>` / `<defs>` 共享）
  - 禁止 Canvas-only 特性（`getImageData` / 复杂合成模式）
  - 详见 [`docs/DESIGN.md`](../../docs/DESIGN.md) §4.4
- **文字必须在 Scene 编译完成时已度量好**——`TextPrim.measuredWidth` / `measuredHeight` 都填好；下游 renderer 直接信任
- 度量函数通过 `CompileOptions.measureText` **依赖注入**；不传走 fallback
- `compileToScene` **必须保持纯函数**：相同 IR + 相同 options → 完全相同的 Scene；禁止 `Math.random()` / `Date.now()` / module-level mutable state

## 解析器（`parsers/`）

- 解析器一律是纯函数：input → output，无副作用
- **输出总是 IR 节点**（`IRStep` / `IRChild` / 未来的完整 `IR`），不是 React props 或其他中间形态
- 解析失败用 `throw new Error('parseXxx: ...')`，错误消息开头标明解析器名

## 公开 API（`src/index.ts`）

- 只通过 `src/index.ts` 暴露公开 API；adapter 不准 import 子路径（如 `@retikz/core/scene/compile`）
- 顶层 `src/index.ts` 用**显式 named re-export**——这是公开契约面，让 API 一目了然
- 内部子 barrel（`ir/index.ts`、`scene/index.ts` 等）用 `export *`——维护轻
