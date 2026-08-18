# ADR-07：Path kind registry

- 状态：Accepted
- 决策日期：2026-06-27
- 关联：[ADR-01](./01-ribbon.md) · [ADR-02](./02-ribbon-boundary-and-alignment.md) · [ADR-03](./03-ribbon-arc-cap.md) · [ADR-05](./05-ribbon-label.md) · [ADR-06](./06-path-ribbon-shared-contract.md)

## 背景

Ribbon 与 stroke Path 共享 style、label、relation host、provenance 和 renderer 输出；保留独立 Ribbon IR 会形成两个 path-like host，并迫使自定义扩展绕过统一机制

## 决策

Path 是 Core 唯一的 path-like relation host。公开 IR 使用 `type: "path"`，以 `kind` 选择几何：

- `kind: "stroke"` 表示普通路径；省略 `kind` 等价于 stroke
- `kind: "ribbon"` 表示可变宽度 ribbon，参数位于 `ribbon`
- 不发布 `type: "ribbon"`、`RibbonSchema` 或 `IRRibbon`

新增统一 Path kind provider contract：

```ts
type PathKindDefinition = {
  schema: ZodType<{ kind: string } & IRJsonObject>;
  compile: (path: IRPath, options: IRJsonObject, context: PathKindCompileContext) => PathKindCompileResult;
};

const definePathKind: <TDefinition extends PathKindDefinition>(definition: TDefinition) => TDefinition;

type CompileOptions = {
  pathKinds?: ReadonlyArray<PathKindDefinition>;
};
```

Built-in 与 custom kind 使用同一 registry。未知 kind 必须 fail-loud 并报告已注册 kind；重复 key 不得静默覆盖，builtin / custom 冲突按统一 duplicate 规则处理

`DrawableStyleSchema` 与 `DrawableMetaSchema` 承载共享 style/meta；`Path.label` 统一承载 `GeometryLabelSchema`；`RibbonPathOptionsSchema` 承载 mode、width、start、end、interpolation、align、samples、sampling、upper、lower 等 ribbon-only 字段。React `<Ribbon>` 可以作为 sugar，但必须生成 `Path kind="ribbon"`

## 行为、失败语义与兼容性

省略 `kind` 的既有 Path 继续按 stroke 解析。注册 Definition 中的函数和 schema 只存在 compile options / provider runtime，不进入 JSON IR；Scene 只保存闭合 Path primitive。未知、重复或 provider 输出无效时在 Core compile fail-loud，不由 renderer 或上层 fallback

这是 0.x 的 Path host 收敛：独立 Ribbon 实体被删除，不保留旧别名、内置 if/else 或 renderer registry。自定义 Path kind 与内置 kind 共用 schema、registry、compile 和诊断链路

## 最终结果与遗留边界

普通 stroke、Ribbon 和 custom path kind 已统一进入 Path host；React sugar、Vanilla authoring 和领域 relation 只消费该公开 contract。Path kind 之外的领域布局、命中策略和 renderer 扩展须由各自 owner 另行设计
