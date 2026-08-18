# @retikz/foundation

跨包复用的基础契约：类型工具、Zod 标量 schema、typed non-empty string 断言和结构化错误骨架。Foundation 不拥有 IR、对象 schema、Diagnostic、renderer 或领域错误语义。

Cross-package primitives for retikz: type utilities, Zod scalar schemas, a typed non-empty string assertion, and a structured error skeleton. Foundation does not own IR, object schemas, diagnostics, renderers, or domain error semantics.

## Install

```bash
pnpm add @retikz/foundation
```

This package is ESM-only and requires Node.js 24 or newer.

## Root imports

Foundation exposes exactly fourteen root exports. Its only production dependency is Zod:

```ts
import {
  assertNonEmptyString,
  isRetikzError,
  NonBlankStringSchema,
  NonNegativeIntegerSchema,
  NonNegativeNumberSchema,
  NormalizedFractionSchema,
  PositiveIntegerSchema,
  PositiveNumberSchema,
  RetikzError,
  RetikzFoundationError,
} from '@retikz/foundation';
import type { AssertEqual, OpenString, RetikzErrorOptions, ValueOf } from '@retikz/foundation';
```

The six schemas are non-transforming validators for non-blank strings, positive/non-negative finite numbers, positive/non-negative safe integers, and inclusive `0..1` fractions. The package has no public subpath exports. Consumers keep object composition, defaults, domain refinements, diagnostics, and recovery at their own boundaries.

## License

MIT
