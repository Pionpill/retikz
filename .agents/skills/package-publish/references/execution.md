# 发布操作与授权

## 授权暂停点

验证后必须停下，向用户展示：

- 改动文件；
- 验证结果；
- 每个包的 dry-run 摘要；
- 目标版本、npm dist-tag、git tag；
- 需要授权的下一步：只 commit，还是 commit + tag + publish + push。

没有当前对话明确授权，不继续执行。

## Commit / Tag / Publish

获得授权后：

1. 只 stage 发布准备文件。
2. 按根 AGENTS 的 commit 格式提交，常用 `🔖 <scope>: 发布 <version>` 或 `🔖 <scope>: 准备发布 <version>`。
3. 确认 HEAD 中发布组每个包都是目标版本。
4. 确认 `git status --short` 没有意外发布文件改动。
5. 再次确认本地和远端不存在同名 tag，按 Kernel 特例或主包名规则创建 annotated tag：`git tag -a <tag-prefix>-v<version> -m "<tag-prefix> <version>"`。
6. 确认 npm 登录：`npm whoami --registry=https://registry.npmjs.org/`。
7. 按组内顺序发布：

```bash
pnpm --filter @retikz/<pkg> publish --access public --tag <tag> --no-git-checks --registry https://registry.npmjs.org/
```

若 npm 要 OTP，加 `--otp=<code>`。OTP 时效短；遇到 `EOTP` 就停下要新码。部分包已发成功后，重试前先 `npm view <pkg>@<version> --registry=https://registry.npmjs.org/`，跳过已发布包。

8. publish 成功后再 push commit 和 tag，除非用户明确要求其它顺序。

不要手动合并 branch-sync PR；分支同步由 GitHub Actions 处理。

## 发布后

发布成功后：

1. 汇报 npm 包 URL、git tag、push 状态和安装命令。
2. 不为开始下一项开发或安置 ADR 自动预 bump；下一次发布准备时再核定目标版本。只有人工明确要求预 bump 时才作为独立改动处理，并单独获取提交授权；未完成能力继续留在原中版本 roadmap。
