# @retikz/foundation

跨包复用的基础契约：类型工具、Zod 标量 schema、JSON 数据快照、typed 字符串与正数断言和结构化错误骨架。Foundation 不拥有 IR、对象 schema、Diagnostic、renderer 或领域错误语义。

Cross-package primitives for retikz: type utilities, Zod scalar schemas, JSON snapshots, typed string and positive-number assertions, and a structured error skeleton. Foundation does not own IR, object schemas, diagnostics, renderers, or domain error semantics.

## Install

```bash
pnpm add @retikz/foundation
```

This package is ESM-only and requires Node.js 24 or newer.

## Root imports

Foundation exposes fourteen root exports. Its only production dependency is Zod:

```ts
import {
  assertNonEmptyString,
  assertPositiveNumber,
  isRetikzError,
  NonBlankStringSchema,
  NonNegativeIntegerSchema,
  NonNegativeNumberSchema,
  NormalizedFractionSchema,
  PositiveIntegerSchema,
  PositiveNumberSchema,
  RetikzError,
  RetikzFoundationError,
  RetikzFoundationErrorCode,
  cloneAndFreezeJson,
} from '@retikz/foundation';
import type { AssertEqual, OpenString, RetikzErrorOptions, ValueOf } from '@retikz/foundation';
```

The six schemas are non-transforming validators for non-blank strings, positive/non-negative finite numbers, positive/non-negative safe integers, and inclusive `0..1` fractions. The package has no public subpath exports. Consumers keep object composition, defaults, domain refinements, diagnostics, and recovery at their own boundaries.

The typed assertions accept values already narrowed to their scalar types. `assertNonEmptyString(value, label)` rejects empty or whitespace-only strings, while `assertPositiveNumber(value, label)` rejects zero, negative, and non-finite numbers. Both return `void` on success and throw `RetikzFoundationError` with the original value in `details` and `cause` on failure.

`cloneAndFreezeJson(value, path)` accepts only JSON-safe plain data, rejects cycles, accessors, symbol keys, sparse arrays, extra array properties, non-finite numbers, and class instances, then returns a detached deeply frozen snapshot. Invalid data throws `RetikzFoundationError` with `RetikzFoundationErrorCode.Json`.

## License

MIT
