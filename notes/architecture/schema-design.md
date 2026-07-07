# IR JSON-Schema 产物设计

> 把各 domain 的 zod IR schema（单一真源）导出成**给 AI / 工具 / MCP / 文档消费的 JSON-Schema 契约**的设计稿。
>
> **状态：方向已定，alpha 阶段不实现，后续统一优化。** 本设计已做过可用原型（core + plot 全跑通、测试守门全绿），评估后决定推迟落地、先把设计沉淀在此；后续按本文实现即可，不必重新探索。
>
> 关联：[`core-design.md` §AI 优先](./core-design.md) · `packages/kernel/core/src/ir/**`（IR zod schema，含 `.describe()`）· `packages/viz/plot/src/ir/**`。

---

## 1. 背景与问题

retikz 是 AI-native 库，IR 的 zod schema 字段都写了英文 `.describe()`，作为「IR 自描述契约」喂给 LLM（生成 / 编辑 IR）。这带来两个现实问题：

1. **describe 是运行时实打实的体积**。实测 `packages/kernel/core/dist/es/ir/*.js`：`.describe(...)` 调用占 **52%**（约 46KB 文本）。且：
   - **tree-shaking 摇不掉**：`compileToScene` 的校验路径会拉入 IR schema 图（`compile` import `../ir`，schema 间互相引用），实测把 `compileToScene` 单独打包仍带 ~397/416 个 `.describe()`。所以 describe 会进消费方 bundle。
   - **minify 削不掉**：describe 是字符串字面量，压缩器原样保留。
2. **describe 不能删**。这是给 AI 的一等公民内容（AI 优先原则），删了等于砍掉核心卖点。

矛盾：describe 必须留（给 AI），又是运行时死重（对渲染消费方无用）。**结论：把「给 AI 的描述」与「给运行时校验的 schema」在产物层面分离**——描述沉到一份独立的、AI 真正读取的 JSON-Schema 产物里；运行时 schema 该怎样还怎样（本设计不动运行时，运行时瘦身是更后面的事，见 §6）。

再叠加一个消费体验问题：

3. **单个大文件不利于 LLM 按需学习**。把整个 IR 导成一个 JSON-Schema 是 137KB（57 个 `$defs`）。LLM 学某一块（比如「怎么写 path」）不该吞整份。需要**分片 + 一个总索引说明各片做什么**，按需加载。

---

## 2. 已决策

### 2.1 单一真源 = zod `.describe()`，产物用 `z.toJSONSchema` 生成

zod schema 仍是唯一真源；JSON-Schema 是**生成物**，随源码 `gen:schema` 重生成并提交，测试守同步（漂移即红）。zod v4 内置 `z.toJSONSchema()` 直接读 `.describe()` 进 JSON-Schema 的 `description` 字段。

**为什么**：不引第二份手写 schema（避免漂移）；zod v4 原生支持，零额外依赖。

### 2.2 按 IR 源码模块分片 + 三层索引

产物结构（每 domain）：

- **per-domain 分片**：按 IR 源码模块归组，每组一个 `<group>.json`（core：scene / node / path / scope / position / tex / text / paint / shape / animation / composite / common）。命名 `$defs`（`Node` / `Path` / …，非匿名 `__schemaN`）。
- **per-domain 索引** `index.json`：`root`（根分片）+ 每片 `{ description, provides, dependsOn }`。
- **跨 domain 总索引** 仓库顶层 `schema/index.json`：`domains[]`，每个 `{ name, package, index 路径, import 子路径, description }`。

加载链路：**顶层总索引 → 某 domain 的 index → 按需取分片**（顺 `dependsOn` 拉依赖）。跨片引用用相对 `$ref`（`./node.json#/$defs/Node`）。

**为什么按源码模块分组**：模块边界本就是语义边界（node / path / scale…），与 LLM 的心智一致；自动归组（不手列 id），新增 schema 自动落到对应片。

**为什么不是另外两种粒度**：

- 单文件（137KB）：LLM 吞整份，差。
- per-entity（57 个文件）：太碎，索引臃肿、加载件数多。
- 自包含 + 内联去重：容器型 schema（scene / scope 含各类 children）会递归内联整张图、爆炸。所以**容器必须用跨片 `$ref`**，纯自包含走不通。

### 2.3 统一的顶层工具（domain-agnostic）

生成逻辑放**仓库顶层** `scripts/schema/`（不在任何包里），target 驱动：

- `engine.ts`：通用引擎，输入一个 target（root zod schema + 按源码模块的分组 + 产物目录）→ 产出分片 + index。
- `targets.ts`：`SCHEMA_TARGETS` 配置数组，core / plot 各一条，未来 domain 加一条即可。
- `generate.ts`：`pnpm gen:schema` 入口，写各 target 产物 + 顶层总索引。
- 测试：每个 target 的漂移 + 索引自洽 + `$ref` 全可解析 + describe 保留守门。

产物提交在各包 `schema/`，经 `@retikz/<pkg>/schema/*` 导出、随 `files` 发包。

**为什么顶层统一**：core 有 schema、plot 有 schema、以后更多 domain 都有；生成逻辑只该有一份，各 domain 只贡献「配置」。

### 2.4 生成的确定性与隔离（实现要点）

实现期踩过的坑，必须照做否则产物不稳定 / 跨 target 串味：

- **id 命名靠 globalRegistry，但用后还原**。`.describe()` 在 zod v4 已把 schema 登记进 `globalRegistry`（带 description）。给具名实体注入 `id`（导出名去 `Schema` 后缀）也写在 globalRegistry。**不能**用 `metadata: localRegistry` 旁路——实测那样只读到 entity 级描述、丢掉字段级描述（50 vs 474 条）。所以用 globalRegistry，但每个 target 生成完把注入的 id **还原**（`globalRegistry.remove` / 还原原 meta），让多 target 同进程互不污染。
- **id 分配确定**：同一 schema 实例被多名导出（别名，如 `ArrowDetailSchema` / `ArrowDefaultSchema` 指同一实例）时，按导出名**字典序最小**胜出、归属取胜者所在分片；否则结果随运行时（tsx / vitest）的导出枚举顺序漂移。
- **`reused: 'inline'`**：已注册 id 的实体进 `$defs`，其余复用片段内联——避免一堆匿名 `__schemaN`，利于阅读。
- **`unrepresentable: 'throw'`**：IR 设计上 100% JSON 可序列化，出现无法表达的构造（transform / custom）即 fail-loud。
- 未归类的 `$def`（如 plot 引用到的 core 基类）兜底进 root 分片，不丢。

### 2.5 参考体量（原型实测）

- core：单文件 137KB → 13 个分片，最大 path 47KB / scope 43KB（这两个域本身复杂），其余 1–8KB。描述 414 条全保留。
- plot：根 `PlotSpecSchema`，9 个分片（plot / mark / scale / encoding / guide / coordinate / data / transform），2.7–25KB。描述 474 条。

---

## 3. 明确反对

- **删除 / 剥离 describe**：砍掉给 AI 的内容，否决。分离 ≠ 删除——描述移到 AI 真正读取的产物里，不是丢掉。
- **手写第二份 JSON-Schema**：必漂移。只能从 zod 生成。
- **`metadata: localRegistry` 旁路 globalRegistry**：丢字段级描述（见 §2.4）。
- **per-entity 57 文件 / 单文件 / 纯自包含内联**：见 §2.2。

---

## 4. 待决策

- **AI 实际怎么消费描述**：构建 / 对话期把生成好的 JSON-Schema 当 prompt / tool schema 喂 LLM（则运行时 JS 里的 describe 对 AI 本就无用，可叠加 §6 的运行时瘦身）；还是运行时 app 内把带描述的 schema 暴露给 LLM（则描述需运行时可达，瘦身要换「按需 import 的注解版 schema」做法）。这一条决定 §6 的形态。
- **path / scope 分片仍偏大**（47 / 43KB）：是否进一步把 step 变体 / scope 默认样式再拆子片，还是接受。
- **顶层总索引的归宿**：仓库根 `schema/index.json`（repo / MCP 读）够不够，要不要同时经 docs 站 / llms.txt 暴露。

---

## 5. 接入新 domain（实现后的操作）

在 `scripts/schema/targets.ts` 加一个 target：`{ name, pkg, rootSchema, rootGroup, version, rootDescription, groups: [{ id, modules, primary?, description }], outDir }`；给该包 `package.json` 加 `./schema/*` 导出 + `files: schema`；`pnpm gen:schema` 生成、提交。

---

## 6. 后续可叠加：运行时 describe 瘦身（更靠后）

本设计只产「给 AI 的 JSON-Schema」，**不动运行时**。等真有客户端体积压力、且 §4 第一条确认「AI 只读产物、不读运行时」后，可再叠加：构建期把运行时 bundle 里的 `.describe()` 剥掉（源码保留、产物剥离），描述仅存于本设计的 JSON-Schema 产物。这一步是 bespoke 优化（社区无现成范式），收益约 ~15KB gzip / domain，需独立评估，不在本设计的首期范围。

---

## 7. alpha 不做的原因

- 体积问题对当前阶段不是瓶颈（运行时 external + tree-shaking + 消费方自压缩已让 app bundle 可控；describe 体积主要是 npm 安装 / 契约可读性问题，非线上性能）。
- 工具 + 产物 + 多包导出 + 测试是一套不小的常驻设施，且 §4 仍有待决策（尤其 AI 消费方式），过早固化易返工。
- 故 alpha 先收敛功能，本能力随设计沉淀，后续随「AI 消费方式」明确后统一落地。
