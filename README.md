# tla-tools

Immutable TLA+ tools (`tla2tools.jar`) releases and the GitHub Action that
installs and verifies them.

## Usage

Pin the action to a full commit SHA and pin the JAR independently by build
identity and SHA-256:

```yaml
- name: Install TLA+ tools
  id: tla-tools
  uses: zactionsz/tla-tools@<full-commit-sha>
  with:
    version: "2026.08.11.125311"
    sha256: "ab323b79802aedc3203b3f9af37c6aca3ed43f4e0225b36f2aa77b26de46c05f"
```

The action exports `TLA2TOOLS_JAR` for later steps. It deliberately does not
set or modify `CLASSPATH`.

It also provides these outputs:

| Output | Value |
| --- | --- |
| `version` | Verified TLC build identity |
| `jar-path` | Absolute path to the verified JAR |
| `sha256` | Verified lowercase SHA-256 digest |
| `java-command` | Shell-ready `java -cp "..." tlc2.TLC` command prefix |

A JDK providing `java` and `jar` must already be available on `PATH`. The
action verifies the exact release download, its SHA-256, the expected TLC
classes inside the JAR, and the build identity that TLC reports before it
exports anything.

## Why this exists

Upstream `tlaplus/tlaplus` publishes `v1.8.0` as a rolling channel: its
`tla2tools.jar` release asset is replaced continuously and old assets are
deleted, so any pin by asset ID eventually returns 404 (rafter observed three
distinct jars in five weeks, and two pinned asset IDs die). This repository
holds exact verified bytes under immutable GitHub release tags. Release assets
and their associated tags cannot be changed after publication.

## Contract

- Every release tag names the TLC build it contains (the version string TLC
  prints at startup).
- Assets under a published tag are immutable.
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
see https://github.com/tlaplus/tlaplus for source and license. The action code
in this repository is also MIT licensed.
