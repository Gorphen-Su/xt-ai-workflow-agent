# xt-sdd-skills

`npx` CLI to install and update the [xt-sdd](https://github.com/Gorphen-Su/xt-ai-workflow-agent) workflow skills
in any Claude Code project.

## Why

`xt-sdd` is a spec-driven development workflow built on top of OpenSpec and Superpowers.
Its 6 core skills (`xt-sdd-propose`, `xt-sdd-plan`, `xt-sdd-apply`, `xt-sdd-verify`, `xt-sdd-archive`,
`xt-sdd-fix`) live under `.claude/skills/` in your project. This CLI fetches the latest version of
those skills from the upstream repo so you don't have to clone or copy files manually.

## Requirements

- Node.js >= 18 (uses the built-in `fetch` API)
- An internet connection (skills are pulled live from GitHub)

## Quick start

```bash
# First-time setup in a project
npx xt-sdd-skills install

# Upgrade an already-installed project to the latest skills
npx xt-sdd-skills update

# See what would be installed
npx xt-sdd-skills list
```

Run inside any project directory. The CLI walks up from `cwd` and uses the first directory containing
`.git/`, `package.json`, `openspec/`, or `.claude/` as the project root.

## Commands

### `install`

Performs a first-time installation. Refuses to run if any `xt-sdd-*` skill already exists in the project
(use `update` instead).

```bash
npx xt-sdd-skills install [options]
```

### `update`

Replaces all `xt-sdd-*` skills with the latest upstream version. Before overwriting, copies the existing
skills to `.claude/skills/.backup/<YYYY-MM-DD-HHmmss>/` along with an `_backup-meta.json` describing
the upgrade.

```bash
npx xt-sdd-skills update [options]
```

If the project has no skills yet, `update` automatically falls back to `install` behavior.

### `list`

Prints the manifest of skills, templates, and command files that would be installed/updated. Does not
hit the network.

```bash
npx xt-sdd-skills list
```

## Options

All commands accept these global options:

| Option | Default | Description |
|--------|---------|-------------|
| `--tag <ref>` | `main` | Git ref to pull from (branch name or git tag, e.g. `v1.0.0`) |
| `--source <owner/repo>` | `Gorphen-Su/xt-ai-workflow-agent` | GitHub repo to pull from (for forks/mirrors) |
| `--dry-run` | off | Print what would be done without touching any files |
| `--no-backup` | off | `update` only — skip the backup step (irreversible, use with care) |

## Exit codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | User error (bad arguments, target not writable, already installed) |
| 2 | Network error (GitHub unreachable, download failed, timeout) |
| 3 | Data error (corrupt tarball, manifest mismatch) |
| 4 | Filesystem error (backup failed, write failed) |

## What gets installed

- `.claude/skills/xt-sdd-propose/`
- `.claude/skills/xt-sdd-plan/`
- `.claude/skills/xt-sdd-apply/`
- `.claude/skills/xt-sdd-verify/`
- `.claude/skills/xt-sdd-archive/`
- `.claude/skills/xt-sdd-fix/`
- `.claude/commands/xt-sdd-*.md` (slash command entry points, if present in source)
- `openspec/sdd-project-profile.yaml` (template, **skipped if you already have one**)
- `openspec/openspec.yaml` (template, **skipped if you already have one**)

## Backup format

Each `update` produces a timestamped directory:

```
.claude/skills/.backup/
└── 2026-06-08-152330/
    ├── xt-sdd-propose/         # full copy of pre-update skill
    ├── xt-sdd-plan/
    ├── ...
    └── _backup-meta.json       # backedUpAt / fromVersion / toVersion / items
```

The CLI never auto-cleans these. When you have more than 5, it will print a reminder so you can decide
what to keep.

## Pinning a version

`main` is the latest commit. For stability, pin a git tag:

```bash
npx xt-sdd-skills update --tag v1.0.0
```

## FAQ

**Q: I get a network error. What do I do?**
Check that `https://codeload.github.com` is reachable. If you're behind a proxy, set `HTTPS_PROXY` /
`HTTP_PROXY` before running `npx`.

**Q: My custom changes to `xt-sdd-propose` were overwritten.**
They were copied to `.claude/skills/.backup/<latest>/xt-sdd-propose/` before the overwrite. Restore by
copying back.

**Q: Can I install from a fork?**
Yes: `npx xt-sdd-skills update --source myorg/my-fork`.

**Q: Why isn't `openspec/sdd-project-profile.yaml` updated?**
It is a per-project template you may have customized. The CLI never overwrites it once it exists. If
you want to refresh, delete it manually first or pull the new version from the upstream repo.

## License

MIT
