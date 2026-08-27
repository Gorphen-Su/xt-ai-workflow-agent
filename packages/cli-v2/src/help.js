// 帮助/usage 输出
const USAGE = `Usage: npx xt-sdd2-skills <command> [options]

Commands:
  install   First-time installation in current project
  update    Upgrade skills in a project that already has xt-sdd2 installed
  list      Print the manifest of skills, templates, and commands

Global options:
  --tag <ref>             Git ref to pull from (default: main)
  --source <owner/repo>   GitHub source (default: Gorphen-Su/xt-ai-workflow-agent)
  --dry-run               Preview operations without writing any files
  --no-backup             update only — skip the backup step (irreversible)
  --json                  list only — print manifest as machine-readable JSON

Examples:
  npx xt-sdd2-skills install
  npx xt-sdd2-skills update --tag v1.0.0
  npx xt-sdd2-skills update --dry-run
  npx xt-sdd2-skills list

Exit codes: 0=success, 1=user error, 2=network, 3=data, 4=filesystem
`;

export function printUsage(stream = process.stdout) {
  stream.write(USAGE);
}
