## Key improvements

- Guard `fetch` responses: treat `res.json()` as `unknown`, validate with `isUser`, and throw on any malformed payload.
- Freeze cached users and hand out defensive copies so external mutation can’t corrupt the shared cache.
- Mark `isAdmin` as a proper type guard, which means `filter(isAdmin)` now returns a correctly narrowed admin array.
- Standardize around explicit return types, status checks, and a lean test harness with no runtime-only dependencies.

## Local setup

```bash
cd q2
pnpm install
```

## Tests

The Jest suite (`pnpm test`) covers:

- Rejection of invalid payloads returned by `fetch`.
- Cache immutability by ensuring repeated calls reuse frozen data while returning fresh copies for callers.
- `getAdmins` filtering to only admins and verifying the `isAdmin` guard in downstream code.
