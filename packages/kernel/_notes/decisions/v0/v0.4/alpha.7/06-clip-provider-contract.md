# ADR-06：Clip provider contract

- 状态：Accepted（2026-07-03 收尾确认，已实现）
- 决策日期：2026-06-29
- 关联：[alpha.7 roadmap](./roadmap.md) · [ADR-01](./01-provider-registry-contract.md) · [ADR-02](./02-provider-key-contract.md) · [ADR-03](./03-capability-provider-migration.md) · [ADR-04](./04-adapter-surface-and-docs.md) · [core-design.md](../../../../../../../notes/architecture/core-design.md)
- 压缩前全文：`git show b7744b60565aa579a6f1deb892b56021633c6754:packages/kernel/_notes/decisions/v0/v0.4/alpha.7/06-clip-provider-contract.md`

## 背景

当前 `Scope.clip` 已经是 renderer-agnostic 能力：IR 中写入裁剪区，compile 阶段把它去重成 `Scene.resources` 里的 `ClipResource`，`GroupPrim.clipRef` 引用该资源，SVG / Canvas adapter 再物化成各自的裁剪机制。这条链路是正确的，但 `clip` 的形状集合仍是封闭的 `rect | circle | ellipse | polygon`，`compile/clip.ts` 与 renderer 都按这四种 `kind` 写 switch。

这和 alpha.7 的 provider contract 收敛目标不一致。`clip` 和 boundary 一样是独立的一等能力：用户应能定义自己的裁剪 kind，并在 IR 里直接写该 kind，而不是被迫包一层 `{ kind: "custom", name, params }`，也不是只能把自定义逻辑塞进内置四形状的参数里。内置 clip 与自定义 clip 应进入同一套 definition / registry / resolve 机制；区别只在于内置 definition 由 `providers/clip` 注册，自定义 definition 由 `CompileOptions.clips` 注入。

同时，完整自定义 clip 不应止步于“自定义 provider 展开成现有四形状”。v0.2 时代已经明确推迟过任意贝塞尔裁剪路径；现在既然 SVG / Canvas 已经能消费结构化 `PathCommand`，应把 Scene 级 clip 能力补齐到 `path` 与 `compound`，让自定义 kind 可以返回真实路径裁剪或复合裁剪区域。

## 决策：`Scope.clip.kind` 成为 clip registry key

`Scope.clip` 保持 JSON-only operation object，`kind` 字段就是 registry key。内置 `rect` / `circle` / `ellipse` / `polygon` / `path` / `compound` 是普通 `ClipDefinition`；用户自定义的 `rounded-rect`、`ticket-stub`、`star-mask` 等 kind 也是普通 `ClipDefinition`。用户自定义 kind 不允许与内置 kind 重名，也不允许在同一 custom 数组内重复。

```ts
export type IRClipSpecObject = IRJsonObject & {
  /** Registry key matched by `ClipDefinition.kind`. */
  kind: string;
};

export type ClipDefinitionInput<TSpec extends IRClipSpecObject> = {
  /** Registry key matched against `Scope.clip.kind`. */
  kind: string;
  /** Schema for the full JSON operation object, including the same `kind` literal. */
  schema: z.ZodType<TSpec>;
  /** Resolve a user-facing clip operation into renderer-agnostic Scene clip geometry. */
  resolve: (spec: TSpec, ctx: ClipResolveContext) => ResolvedClipShape;
};

export type ClipDefinition = ClipDefinitionInput<IRClipSpecObject>;

export type ClipResolveContext = {
  round: (n: number) => number;
  resolve: (clip: IRClipSpec) => ResolvedClipShape;
};

export type ResolvedClipShape =
  | { kind: 'rect'; x: number; y: number; width: number; height: number }
  | { kind: 'circle'; cx: number; cy: number; r: number }
  | { kind: 'ellipse'; cx: number; cy: number; rx: number; ry: number }
  | { kind: 'polygon'; points: Array<[number, number]> }
  | { kind: 'path'; commands: Array<PathCommand>; fillRule?: 'nonzero' | 'evenodd' }
  | { kind: 'compound'; children: Array<ResolvedClipShape>; fillRule?: 'nonzero' | 'evenodd' };

export type CompileOptions = {
  clips?: ReadonlyArray<ClipDefinition>;
  // ...
};
```

`ClipSpecSchema` 改为“内置精确分支 + custom operation object”模型：

- 内置分支继续精确校验 `rect` / `circle` / `ellipse` / `polygon` / `path` / `compound`。
- custom 分支允许任意 JSON object，只要求 `kind` 是非空字符串，且不属于内置 kind 集合。
- 对于内置 kind，不能被 custom 分支兜底；例如 `{ kind: 'rect', foo: 1 }` 必须被 `rect` schema 拒绝。

compile 阶段不再直接 `switch (clip.kind)`。`createClipRegistry(round, clips)` 会先调用 `resolveClipRegistry(clips)` 得到有效 definition map，然后：

1. 根据 `clip.kind` 找 `ClipDefinition`。
2. 找不到时 fail-loud，错误提示 `CompileOptions.clips`、失败 kind 与已注册 kind。
3. 找到后用 definition schema parse 整个 operation object。
4. 调用 `resolve(spec, ctx)` 得到 `ResolvedClipShape`。
5. 对 resolved shape 做 finite / positive / path command 守卫与 precision round。
6. 用 resolved shape 的 JSON 作为去重 key，分配稳定 `clip-N` id。

内置 `compound` 的 `children` 是 `Array<IRClipSpec>`，compile 时递归走同一个 `ctx.resolve`，因此 compound 可以混合内置与自定义 clip。Scene 中只保存 `ResolvedClipShape`，不会把 runtime definition 或未解析的 custom kind 传给 renderer。

理由：

1. `kind` 是 operation provider 的天然 key。`clip` 不是字符串引用 provider；额外包 `{ kind:'custom', name }` 会制造两套 discriminator，削弱 AI 生成 IR 的直觉。
2. custom kind 与 builtin kind 同为一等公民，符合 alpha.7 “内置与扩展只是在同一机制下注册的不同 definition”的全仓原则。
3. renderer 只能消费纯 JSON Scene。让 provider 在 compile 阶段解析成 `ResolvedClipShape`，可以保持 renderer-agnostic，不引入 SVG-only raw path 或 Canvas callback。
4. 新增 `path` / `compound` 后，custom provider 不再被四种内置几何限制，完整覆盖任意曲线与复合裁剪区域。


## 不在本 ADR 范围

- 不支持 renderer-specific raw SVG `<clipPath>` / raw `d` 字符串；路径必须使用结构化 `PathCommand`。
- 不把 clip definition 传给 renderer；renderer 只消费 compile 后的 `ResolvedClipShape`。
- 不为 custom clip 提供覆盖内置 kind 的逃生口。
- 不新增 primitive-level `clip` 字段；本 ADR 仍只处理现有 `Scope.clip -> GroupPrim.clipRef` 管线。
- 不修复“transformed scope 内 path hoist 后不受 scope.clip 裁剪”的既有架构限制；该问题属于 path 局部坐标编译重构。
