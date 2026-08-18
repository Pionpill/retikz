# ADR-06：Clip provider contract

- 状态：Accepted
- 决策日期：2026-06-29
- 关联：[ADR-01](./01-provider-registry-contract.md) · [ADR-02](./02-provider-key-contract.md) · [ADR-03](./03-capability-provider-migration.md) · [ADR-04](./04-adapter-surface-and-docs.md)

## 背景

`Scope.clip` 已经在 compile 阶段生成 renderer-agnostic `ClipResource`，但早期形状集合封闭为 `rect | circle | ellipse | polygon`，自定义 provider 不能表达真实路径或复合裁剪

## 决策

`Scope.clip.kind` 是 Clip registry key。内置和自定义均使用同一 `ClipDefinition`：

```ts
type IRClipObject = IRJsonObject & { kind: string };

type ClipDefinitionInput<TClip extends IRClipObject> = {
  kind: string;
  schema: z.ZodType<TClip>;
  resolve: (spec: TClip, ctx: ClipResolveContext) => ResolvedClipShape;
};

type ResolvedClipShape =
  | { kind: 'rect'; x: number; y: number; width: number; height: number }
  | { kind: 'circle'; cx: number; cy: number; r: number }
  | { kind: 'ellipse'; cx: number; cy: number; rx: number; ry: number }
  | { kind: 'polygon'; points: Array<[number, number]> }
  | { kind: 'path'; commands: Array<PathCommand>; fillRule?: 'nonzero' | 'evenodd' }
  | { kind: 'compound'; children: Array<ResolvedClipShape>; fillRule?: 'nonzero' | 'evenodd' };

type CompileOptions = { clips?: ReadonlyArray<ClipDefinition> };
```

内置精确分支继续校验 `rect`、`circle`、`ellipse`、`polygon`、`path`、`compound`；custom 分支只接受非空 `kind` 的 JSON object，且不能兜底接受内置 kind。Compile 按 kind 查 definition，解析完整 operation object，调用 `resolve(spec, ctx)`，执行 finite/positive/path-command 校验和 precision round，再以 resolved JSON 去重并生成稳定 clip resource

`compound.children` 递归使用同一 `ClipResolveContext`，可混合内置与自定义 clip。Scene 只保存纯 JSON `ResolvedClipShape`，renderer 不接收 runtime definition、raw SVG 或 Canvas callback

## 行为、失败语义与兼容性

未知 kind、重复 key、schema 不匹配、provider 输出无效、非有限几何、path command 非法或递归超限必须 fail-loud，并报告 `CompileOptions.clips`、失败 kind 与已注册 kind；不静默降级为内置形状。`Scope.clip -> GroupPrim.clipRef` 管线保持，primitive-level clip 不在本契约内

## 最终结果与遗留边界

内置与 custom clip 已通过统一 definition/registry/resolve 机制生成 renderer-neutral clip resource，并覆盖 path/compound。raw SVG、renderer-specific object 和 builtin override 不属于该能力；后续 clip 扩展沿同一 provider contract
