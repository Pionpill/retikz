# ADR-02：Block 整体宽度约束

- 状态：Proposed
- 决策日期：2026-08-29
- 关联：[Graph v0.1 alpha.2 roadmap](./roadmap.md) · [Block 开放内容与布局容器](./03-block-open-content.md) · [Schematic Graph 完备设计](../../../../../architecture/schematic-graph-complete.md) · [Schematic 制图能力域设计](../../../../../../../../notes/architecture/schematic-design.md)

## 背景与目标

Block 的任意有序 children 可以根据内容形成自然宽度，但代码和工程结构图通常需要多个 Block 保持统一或至少不小于某个阅读宽度。当前 Block 只能由内容贡献宽度，作者无法声明外层边框应采用的固定宽度或最小宽度

本决策为 Block 增加外层宽度约束，同时保持宽度计算属于 Layout / Surface 的既有 allocation 语义。它只解决 Block 的水平整体尺寸，不扩展高度、单个 child 尺寸或 Diagram 布局结果

## 决策

### Block 提供固定宽度与最小宽度

Block 增加两个可选字段：

- `width`：Block 外层 Surface 的固定总宽度，包含左右 padding
- `minWidth`：Block 外层 Surface 的最小总宽度，包含左右 padding；未指定 `width` 时，Block 在内容自然宽度与该下限之间取较大值

两个字段均使用有限非负数。省略两个字段时使用有效 `minWidth: 240`，同时保留内容超过下限后的自然增长；显式 `width` 或 `minWidth` 优先。不为 Block 增加 `height`、`minHeight` 或第二套尺寸对象

当 `width` 与 `minWidth` 同时存在时，必须满足 `minWidth <= width`。`width` 是最终外层宽度，`minWidth` 只表达下限，不改变 children 的声明顺序或局部排版语义

### 复用现有 proposal 与 Surface allocation

Block 的宽度约束作用于最外层 Surface 的 allocation box，而不是任意单个 child。Block 继续通过既有 Core/Layout proposal、probe、allocation 与 replay 求值：固定宽度对应水平 Exact 约束，最小宽度对应带下限的水平 Range 约束；未声明时沿用父级 proposal

父级 proposal 仍是当前布局上下文的约束来源。若父级提供更窄的不可扩展槽位，Block 遵循 Core/Layout 已有的 proposal 与 overflow 语义；Block 不新增裁剪、压缩、溢出或尺寸冲突的平行规则。宽度包含 Surface padding，因此 padding 不会在外层宽度之外再次累加

Block 的垂直 allocation、内部 Flex 排版、child identity、NodeTarget、Graph Theme 与 renderer-neutral Scene 语义保持不变。Graph 不把宽度写入 Diagram layout result、endpoint 索引或其它缓存事实源

### 输入、入口与兼容性

Direct IR、React `Block` 与 Vanilla `block` 暴露同一 `width` / `minWidth` Source 字段，并继续经过同一 Block schema、resolve、lowering 与 Core/Standard 主链。有效 `minWidth: 240` 只在 resolve 后的 Canonical 中补齐，不回写到 Source；显式 `width` 或 `minWidth` 保持作者优先级

`Graph` / `Layout` 宿主的 `width` 仍表示 Scene 或布局容器尺寸，不与 Block 的整体宽度合并。任意 child 的尺寸、identity 与连接区域继续由其 owner 决定；Block 不把整体宽度复制到 child

## 基础数据结构与公开契约

```ts
type IRBlock = Readonly<{
  // 既有 Block 字段
  width?: number;
  minWidth?: number;
}>;
```

`width` 与 `minWidth` 均为有限非负 user units。两个字段都省略时表示内容驱动且外层宽度不小于 `240`；显式 `width` 固定外层宽度，显式 `minWidth` 替代默认下限。两者同时出现且 `minWidth > width` 属于 schema 非法状态

## 行为、失败语义与兼容性

- 未声明 `width` / `minWidth` 时，Block 使用有效 `minWidth: 240`，内容需要更宽时继续自然增长，并遵循父级 proposal
- 仅声明 `width` 时，Block 外层 Surface 的 allocation width 为该值，且包含左右 padding
- 仅声明 `minWidth` 时，Block 外层 Surface 的 allocation width 不小于该值；内容需要更宽时可以继续增长，除非父级 proposal 或既有 overflow 语义限制它
- 同时声明时，`minWidth <= width`；不满足该关系由 Block schema fail-loud
- 非有限、负数或未知字段由现有 strict schema fail-loud；父级 proposal 与 Surface padding 无法满足时沿用 Core/Standard 原有诊断
- width 约束不改变 Block root 或 child identity，不创建 Port、尺寸缓存或 Diagram-specific 字段
- 这是 alpha.2 的新增 Source 字段，不提供旧名、兼容别名、迁移层或双轨配置
