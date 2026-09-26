# 发布验证

## 验证

发版可扩大功能性检查范围，但不自动授权性能、压力、基准或 LLM 测试；这些测试须在当前对话明确授权类别与范围。任一步失败就停。

给用户申请授权前至少跑：

```bash
pnpm run check:full
pnpm run check:release-groups
pnpm --workspace-concurrency=1 -r --if-present run build
pnpm run test:publish-artifacts
```

测试另行选择已确认的功能性套件。执行上述命令及任何聚合脚本前，检查其实际调用范围；不得直接运行混有未授权测试的 `test:full`、`test:run` 或 `test:changed`。混合套件须显式筛选功能性用例；无法可靠隔离时运行已确认的功能性子集并报告缺口，不以发布为由运行其余测试。

跨 workspace 验证默认在实际执行递归任务的 pnpm 命令上显式传 `--workspace-concurrency=1`，逐包串行执行；不要仅依赖环境变量或给外层脚本传参。该参数不限制包内 Vitest / 构建工具的并发，也不筛选测试类型；仍须先排除未授权测试。

然后按发布顺序 dry-run 发布组内每个包：

```bash
pnpm --filter @retikz/core publish --dry-run --no-git-checks --access public --tag <tag> --registry https://registry.npmjs.org/
```

冻结目标 tarball 后，必须额外验证真实用户依赖闭包：只把本次目标包 override 到 frozen exact tarball，其余 `@retikz/*` 禁止使用 workspace 或本地 support tarball；在全新 consumer 中运行 `pnpm install --registry=https://registry.npmjs.org/`，保存 lockfile 并核对解析版本，再对全部公开 export 执行 ESM import 与严格 TypeScript smoke。若另有全 workspace tarball fixture，两者必须都通过；本地闭包通过不能替代官方 registry 闭包。

逐包检查 dry-run 输出：

- tarball 只包含 `dist/`、`LICENSE`、`README.md`、`package.json`；
- runtime 只位于 `dist/**/*.js`，declarations 只位于 `dist/types/**/*.d.ts` / `*.d.ts.map`；
- 不含 `dist/es`、`dist/lib` 或 `.cjs`，全部 package exports 与公开 subpath 已通过 packed ESM import；
- `workspace:*` 依赖已解析为确切版本，`workspace:^` 依赖已解析为兼容范围；
- package name 和 version 正确；
- publishable 包没有 `"private": true`；
- 没有 `.js`、`.d.ts`、`.d.ts.map` 泄漏到 `packages/*/*/src`。

辅助检查：

```bash
rg '"private": true' packages/*/*/package.json
rg --files packages | rg 'packages/.*/src/.*\.(d\.ts|d\.ts\.map|js)$'
```

若公开模块正常增长导致 artifact limits 需要调整，先完成构建，再显式运行 `pnpm run update:publish-artifact-limits`；逐包核对生成的文件数与 tarball bytes diff 后，重新运行普通 `pnpm run test:publish-artifacts`。普通验证命令不得改写 limits。
