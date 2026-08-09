# @retikz/foundation

跨包复用的零依赖基础契约：类型工具、typed non-empty string 断言和结构化错误骨架。Foundation 不拥有 IR、schema、Diagnostic、renderer 或领域错误语义。

Cross-package, zero-dependency primitives for retikz: type utilities, a typed non-empty string assertion, and a structured error skeleton. Foundation does not own IR, schemas, diagnostics, renderers, or domain error semantics.

## Install

```bash
pnpm add @retikz/foundation
```

This package is ESM-only and requires Node.js 24 or newer.

## Root imports

Foundation exposes exactly seven root exports:

```ts
import { assertNonEmptyString, isRetikzError, RetikzError } from '@retikz/foundation';
import type { AssertEqual, OpenString, RetikzErrorOptions, ValueOf } from '@retikz/foundation';
```

The package has no public subpath exports. Consumers narrow `unknown` values and add domain-specific error codes, messages, details, diagnostics, and recovery at their own boundaries.

## License

MIT
