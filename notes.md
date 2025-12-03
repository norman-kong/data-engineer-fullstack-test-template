# Setup



### Fix: Nx + Vitest ESM Error

**Problem**  
Running `pnpm nx serve web` caused:

```
Failed to process project graph.
require() of ES Module ... not supported.
```

**Cause**  
- `vite.config.mts` is pure ESM.  
- Vitest v4 is ESM-only.  
- Nx’s `@nx/vitest` plugin is CommonJS.  
- Nx tries to `require()` ESM → incompatible → crash.

**Fix**  
Remove the Vitest plugin from `nx.json` (tests not needed for this assignment).

**Steps**
1. Open `nx.json`
2. Find the `plugins` array
3. Remove `@nx/vitest` from the list
4. Run:

```bash
pnpm install
pnpm nx reset
pnpm nx serve web
```

**Result**
Nx no longer loads the incompatible Vitest plugin → project graph builds successfully → frontend runs normally.
