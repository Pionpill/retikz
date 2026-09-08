# @retikz/foundation

跨包复用的基础契约：类型工具、Zod 标量与通用 JSON schema、JSON 数据快照、结构只读集合快照、typed 字符串与正数断言和结构化错误骨架。Foundation 不拥有 IR、领域对象 schema、Diagnostic、renderer 或领域错误语义。

Cross-package primitives for retikz: type utilities, Zod scalar and generic JSON schemas, JSON snapshots, structurally readonly collection snapshots, typed string and positive-number assertions, and a structured error skeleton. Foundation does not own IR, domain object schemas, diagnostics, renderers, or domain error semantics.

## Install

```bash
pnpm add @retikz/foundation
```

This package is ESM-only and requires Node.js 24 or newer.

## Root imports

Foundation exposes twenty runtime exports and generic JSON type contracts from its root. Its only production dependency is Zod:

```ts
import {
  assertNonEmptyString,
  assertPositiveNumber,
  cloneAndFreezeJson,
  createOpenStringSchema,
  createReadonlyMap,
  isRetikzError,
  JsonObjectSchema,
  JsonValueSchema,
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
import type {
  AssertEqual,
  JsonObject,
  JsonValue,
  NonEmptyReadonlyArray,
  OpenString,
  RetikzErrorOptions,
  ValueOf,
  WithRequiredProperties,
} from '@retikz/foundation';
```

`NonEmptyReadonlyArray<T>` describes a readonly array with at least one element. `WithRequiredProperties<T, TKey>` makes only the selected keys required while preserving every other property from `T`, including readonly and optional members.

`JsonValueSchema` and `JsonObjectSchema` expose Zod's recursive JSON validation for domain-neutral values and string-keyed objects. They reject non-JSON leaves without adding a separate walker, filter, clone, freeze, or parser. The six fixed scalar schemas validate non-blank strings, positive/non-negative finite numbers, positive/non-negative safe integers, and inclusive `0..1` fractions. `createOpenStringSchema(values)` combines a const object enum with the same non-blank custom-string boundary, preserving built-in suggestions in TypeScript and JSON Schema without closing runtime extension keys. The package has no public subpath exports. Consumers keep domain object composition, registries, defaults, refinements, diagnostics, and recovery at their own boundaries.

```ts
const Role = { Participant: 'participant', Activity: 'activity' } as const;
const RoleSchema = createOpenStringSchema(Role);

RoleSchema.parse('participant');
RoleSchema.parse('custom.role');
```

`createReadonlyMap(entries)` copies entries into a frozen shallow snapshot that preserves native Map lookup and iteration semantics without exposing `set`, `delete`, or `clear`. It preserves value identity and does not deep-freeze values.

The typed assertions accept values already narrowed to their scalar types. `assertNonEmptyString(value, label, ownerError?)` rejects empty or whitespace-only strings, while `assertPositiveNumber(value, label, ownerError?)` rejects zero, negative, and non-finite numbers. Both return `void` on success. Without `ownerError`, they throw `RetikzFoundationError` with the original value in `details` and `cause`; with an owner error, they throw that exact error unchanged.

`cloneAndFreezeJson(value, path)` accepts only JSON-safe plain data, rejects cycles, accessors, symbol keys, sparse arrays, extra array properties, non-finite numbers, and class instances, then returns a detached deeply frozen snapshot. Invalid data throws `RetikzFoundationError` with `RetikzFoundationErrorCode.Json`.

## License

MIT
