# @retikz/foundation

跨包复用的基础契约：类型工具、结构只读集合快照、Zod 标量 schema、typed 字符串与正数断言和结构化错误骨架。Foundation 不拥有 IR、对象 schema、Diagnostic、renderer 或领域错误语义。

Cross-package primitives for retikz: type utilities, structurally readonly collection snapshots, Zod scalar schemas, typed string and positive-number assertions, and a structured error skeleton. Foundation does not own IR, object schemas, diagnostics, renderers, or domain error semantics.

## Install

```bash
pnpm add @retikz/foundation
```

This package is ESM-only and requires Node.js 24 or newer.

## Root imports

Foundation exposes exactly eighteen root exports. Its only production dependency is Zod:

```ts
import {
  assertNonEmptyString,
  assertPositiveNumber,
  createReadonlyMap,
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
} from '@retikz/foundation';
import type { AssertEqual, NonEmptyReadonlyArray, OpenString, RetikzErrorOptions, ValueOf } from '@retikz/foundation';
```

`NonEmptyReadonlyArray<T>` describes a readonly array with at least one element. The six schemas are non-transforming validators for non-blank strings, positive/non-negative finite numbers, positive/non-negative safe integers, and inclusive `0..1` fractions. The package has no public subpath exports. Consumers keep object composition, defaults, domain refinements, diagnostics, and recovery at their own boundaries.

`createReadonlyMap(entries)` copies entries into a frozen shallow snapshot that preserves native Map lookup and iteration semantics without exposing `set`, `delete`, or `clear`. It preserves value identity and does not deep-freeze values.

The typed assertions accept values already narrowed to their scalar types. `assertNonEmptyString(value, label)` rejects empty or whitespace-only strings, while `assertPositiveNumber(value, label)` rejects zero, negative, and non-finite numbers. Both return `void` on success and throw `RetikzFoundationError` with the original value in `details` and `cause` on failure.

## License

MIT
