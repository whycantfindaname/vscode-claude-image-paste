# Type and Error Conventions

## Compiler Contract

[`tsconfig.json`](../../../tsconfig.json) is authoritative: TypeScript runs in
strict mode with unused-local and unused-parameter checks. The source targets
ES2021 and CommonJS, compiles only `src/**/*.ts`, and emits to `out/`.

Use explicit types at module and external boundaries while allowing inference
for obvious local values. Current examples include:

- `ClipboardImage` for the clipboard adapter result in
  [`src/clipboard.ts`](../../../src/clipboard.ts).
- `ImagePasteResult = "pasted" | "no-image" | "error"` for orchestration state
  in [`src/extension.ts`](../../../src/extension.ts).
- `"bracketedPaste" | "plain"` for the setting consumed by
  [`src/insert.ts`](../../../src/insert.ts).
- `string | undefined` for a disabled optional remote directory in
  [`src/imagePath.ts`](../../../src/imagePath.ts).

Keep literal unions aligned with the corresponding manifest enum. Do not use a
broad `string` where downstream behavior is a closed set.

## External and Nullable Values

Configuration reads use `config.get<T>(key, default)` with the same default as
`package.json`. Platform APIs and subprocesses can fail, so treat caught values
as `unknown` and convert them at the UI boundary with:

```ts
err instanceof Error ? err.message : String(err)
```

Use `null` for the expected "no clipboard image" outcome and `undefined` for a
blank optional configuration that activates fallback behavior. Exceptions are
for unsupported platforms, invalid configured paths, missing workspace or
terminal preconditions, and actual read/write/send failures.

## Async and Error Ownership

- Await ordered user-visible operations: clipboard read, directory/file write,
  and terminal insertion.
- Keep cleanup and temporary-directory removal best-effort only where the
  primary operation has already succeeded or is returning.
- Catch at the layer that can make a product decision. Clipboard adapters may
  try the next platform mechanism; `extension.ts` decides what to report and
  whether smart paste should fall back.
- Use `Promise.allSettled` for independent cleanup candidates so one stale-file
  failure does not abort the rest.

## Anti-Patterns

- Do not add `any`, unchecked config casts, or open-ended string modes to bypass
  strict compilation.
- Do not collapse `"no-image"` and operational failure into a thrown exception;
  smart paste intentionally falls back for both while forced paste announces
  only the expected no-image case.
- Do not silently swallow failures in the primary paste path. Silent catches
  are limited to documented fallbacks or cleanup.
- Do not duplicate manifest defaults only in code; if a default or enum changes,
  update `package.json`, source, README, STRUCTURE, and tests as applicable.
- Do not export VS Code-dependent helpers merely to unit-test them. Extract a
  pure policy module when the behavior is independently meaningful, as
  `imagePath.ts` demonstrates.

## Verification

```bash
npm run compile
npm test
```

Compilation must remain warning-free under the existing strict and unused-code
settings. Add tests when a pure boundary contract changes; use the manual VS
Code checks in [Quality Guidelines](./quality-guidelines.md) for host APIs.
