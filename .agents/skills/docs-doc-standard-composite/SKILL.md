---
name: docs-doc-standard-composite
description: Use when writing, restructuring, translating, or reviewing an apps/docs component page for an @retikz/standard Tier 2 composite such as Grid, Axes, or Frame.
---

# Standard Composite 组件文档

## 前置规则

**REQUIRED SUB-SKILLS:** 先读 `docs-doc-principle` 与 `docs-doc-component`。

按页面内容继续读：

- 有 controls：`docs-doc-control` 与 `docs-doc-principle/references/component-preview.md`
- 有 lowering 逻辑图：`docs-figure-contract` 与 `docs-figure-logic`
- 使用 `<ZodSchema>`：`docs-doc-principle/references/reference-pages.md`

再读 `packages/library/AGENTS.md`、`packages/library/standard/AGENTS.md`，以及当前能力在 standard、standard-react、standard-vanilla 中的公开入口和测试。

## 先闭合三条用户路径

从实现而非命名推导契约：

| 路径        | 必须核对的内容                                                              |
| ----------- | --------------------------------------------------------------------------- |
| React       | 组件 props 如何生成 Standard IR，以及 Definition 是否向当前 Layout 局部贡献 |
| Vanilla     | helper、Adapter、挂载入口，以及与 React 是否复用同一 schema 与 lowering     |
| 持久化 / IR | 完整 IR 的 discriminator、schema、factory，以及加载时如何注入 Definition    |

Definition 含函数，不进入 JSON；持久化完整 IR，不把 authoring input 冒充可独立识别的实体。完整挂载流程链接 `/standard/get-start`，组件页只展开当前能力的特有语义。

## 页面组织

沿用组件页的五段顺序，并确保 zh / en 标题和层级对齐：

1. **用法 / Usage**：两个纯代码块给出 import 与最小 JSX；紧接三条用户路径的公开入口表
2. **示例 / Examples**：按“基础 → 常见变体 → 自行调整”递进
3. **技术原理 / How it works**：解释 Tier 2 lowering 与未注册诊断
4. **API 参考 / API Reference**：四列表记录字段、类型、默认值和用户语义
5. **相关 / Related**：链接 Core 输出图元、Composite 概念与相邻 Standard 能力

frontmatter 先说明这个 composite 保留了什么高层意图，以及它最终下沉为何种 Core IR。不要把 props 清单当导言。

## 递进式示例

### 基础

先用用户语言说明必填语义字段分别决定什么，再给一个 canonical demo。读者不打开源码也应能定义最小有效对象。

### 常见变体

只平铺会改变语义、结构或组合关系的代表性变体。同组可比较场景放进一个 demo 并横向排列；优先压缩逻辑画布和构图，不缩小单个标签。仅参数不同的案例进入 playground。

### 自行调整

最后提供一个 controls playground，覆盖剩余有教学价值的公开参数：

- 使用固定 `viewBox`、完整 `canonicalValues` 与准确的 `relatedApis`
- 用 `visibleWhen` 隐藏当前分支无效的字段
- zh / en 仅文案不同；id、kind、默认值、范围、选项和条件完全一致
- 操作范围、尺寸、样式或顺序时，主体与相机保持稳定，极值不裁切

## Standard 预览闭环

Standard composite demo 应通过共享 ComponentPreview 管线自动得到 IR、Vanilla 源码和真实 Vanilla render。不要为单页手写等价 Vanilla 文件。

新 composite 尚未被转换器支持时，同一改动必须补齐共享 schema 解析、helper / Adapter 生成和回归测试；明确的 `Unsupported Standard composite` 诊断不能作为文档完成态。controls demo 的 IR / Vanilla 基线取 canonical 状态，不取实时交互值。

## 技术原理与 API

技术原理图只画当前能力的职责链：

```text
Standard JSON IR → Definition → lowering → Core IR[]
```

用 retikz 自绘并设置 `hideCode`；图到 Core IR 即停止，不重复全局 compiler / renderer 管线。预览尺寸选择能完整容纳内容的最小档，低矮流程图优先尝试 `xs`。正文同时说明未注入 Definition 时的真实诊断。

API 默认值必须同时核对 schema default、factory parse 和 lowering fallback。嵌套对象展开字段类型；中文页所有可见文案都要翻译，包括标题、表头、描述、controls、caption、图中文字与 `SourceLinks.label`。公共标识符和诊断码保留英文。

## 新页面文件闭环

新增页面时同步检查：

- `contents/standard/composite/<capability>/index.{zh,en}.mdx` 与 demo / controls
- `data/standard.ts`、zh/en i18n、composite 落地页
- Standard introduction / get-start 的能力清单与相关页链接
- ComponentPreview Standard 转换器及其 source / controls registry 测试

## 验证

按改动范围运行：

```bash
node .agents/skills/docs-doc-principle/scripts/check-doc-integrity.mjs --scope standard/composite/<capability>
pnpm exec prettier --write <changed-files>
pnpm --filter @retikz/docs exec tsc --noEmit
pnpm --filter @retikz/docs exec vitest run <related-preview-tests>
git diff --check
```

在真实页面检查 zh / en、桌面 / 500px 窄屏、React / IR / Vanilla tabs、controls 默认值与组合极值。确认没有 `Demo ... not found`、`Unknown schema`、`Unsupported Standard composite`、横向滚动、裁切或未翻译文案。

## 常见遗漏

- 只写 React 用法，读者不知道 Vanilla 与持久化入口
- 把多个参数变体拆成重复 demo，或让四个可比较案例换行
- controls 有字段未消费、未翻译或在无效状态仍显示
- lowering 图延伸到全局 renderer，模糊 Standard 的职责终点
- 中文 API 标题、SourceLinks 或 control labels 残留英文
- React demo 可见，但自动生成的 Vanilla 代码或 render 实际失败
