# tla-tools

Immutable mirror of the TLA+ tools (`tla2tools.jar`) pinned by
[zsumz/rafter](https://github.com/zsumz/rafter)'s model-checking CI.

## Why this exists

Upstream `tlaplus/tlaplus` publishes `v1.8.0` as a rolling channel: its
`tla2tools.jar` release asset is replaced continuously and old assets are
deleted, so any pin by asset ID eventually returns 404 (rafter observed three
distinct jars in five weeks, and two pinned asset IDs die). This repository
holds exact verified bytes under release tags that are never replaced.

## Contract

- Every release tag names the TLC build it contains (the version string TLC
  prints at startup).
- Assets under a published tag are never replaced or deleted.
- The consumer verifies SHA-256 against its own pinned digest before use;
  this mirror is a distribution point, not a trust root.

## Provenance

`tla2tools-2026.08.11.125311` was downloaded from upstream release asset
510140106 (`tlaplus/tlaplus` tag `v1.8.0`) on 2026-08-11, verified against
the GitHub Releases API digest, and smoke-tested (`tlc2.TLC -h` reports
`Version 2026.08.11.125311`):

```
sha256 ab323b79802aedc3203b3f9af37c6aca3ed43f4e0225b36f2aa77b26de46c05f
```

The TLA+ tools are licensed under the MIT License by their upstream authors;
see https://github.com/tlaplus/tlaplus for source and license.
