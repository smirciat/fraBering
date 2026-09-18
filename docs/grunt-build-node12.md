# Grunt build on Node 12 (`primordials` / `cdnify`)

## Symptom

```
Loading "cdnify.js" tasks...ERROR
>> ReferenceError: primordials is not defined
```

Happens when **jit-grunt** loads **`grunt-google-cdn`**, which pulls **`google-cdn` → bower → `graceful-fs@2`**. That stack breaks on Node 12+ even if the shell `node -v` is correct — a bad `npm install` can leave nested `graceful-fs@2` in `node_modules/google-cdn/`.

## Fix in repo (Sep 2026)

**`cdnify` is a no-op** registered in `Gruntfile.js`. Vendor libraries are copied from **Bower** into `dist/client`; production `index.html` does not rely on Google CDN script rewrites.

You can remove `grunt-google-cdn` from `devDependencies` later; it is no longer loaded.

## Commands

```bash
nvm use 12   # or ensure PATH is Node ^12.22.12
node -v
npm -v       # ^6.14.12 per package.json engines

# Full prod client + server
npx grunt build

# API-only (ROT server changes)
npx grunt buildServer
```

## If other grunt tasks break after `npm install`

1. Use Node 12 only (`which node` before build).
2. Clean install: `rm -rf node_modules && npm install` (runs `preinstall` → `npm-force-resolutions` for `graceful-fs@^4.2.11`).
3. Do not use Node 17+ for this repo.

## Verify

```bash
npx grunt cdnify
# should log: cdnify: skipped (local bower bundle; ...)
```
