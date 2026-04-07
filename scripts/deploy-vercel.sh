#!/usr/bin/env bash
set -euo pipefail

mode="${1:-preview}"
shift || true

note="${DEPLOY_NOTE:-}"
if [[ $# -gt 0 ]]; then
  note="$*"
fi

if [[ -z "${note}" ]]; then
  echo "Usage: bash scripts/deploy-vercel.sh <preview|production> \"变更说明\"" >&2
  echo "Example: bash scripts/deploy-vercel.sh preview \"修复页面切换时滚动条回到顶部的问题\"" >&2
  exit 1
fi

if ! command -v vercel >/dev/null 2>&1; then
  echo "Error: vercel CLI is required but was not found on PATH." >&2
  exit 1
fi

if ! command -v node >/dev/null 2>&1; then
  echo "Error: node is required but was not found on PATH." >&2
  exit 1
fi

project_root="$(cd "$(dirname "$0")/.." && pwd)"
scope="${VERCEL_SCOPE:-yankesuns-projects}"
timestamp_display="$(date '+%Y-%m-%d %H:%M:%S %Z')"
timestamp_meta="$(date '+%Y-%m-%dT%H:%M:%S%z')"

deploy_args=(
  deploy
  "$project_root"
  --yes
  --scope
  "$scope"
  --format
  json
  --meta
  "releaseNote=$note"
  --meta
  "releaseTimestamp=$timestamp_meta"
)

environment_label="Preview"

case "$mode" in
  preview)
    ;;
  production|prod)
    deploy_args+=(--prod)
    environment_label="Production"
    ;;
  *)
    echo "Error: mode must be either 'preview' or 'production'." >&2
    exit 1
    ;;
esac

echo "Deploying ${environment_label} build to Vercel..."
deployment_json="$(vercel "${deploy_args[@]}")"

deployment_url="$(
  printf '%s' "${deployment_json}" | node -e '
    const fs = require("fs");
    const input = fs.readFileSync(0, "utf8");
    const data = JSON.parse(input);
    const deployment = data.deployment || {};
    const rawUrl = data.url || deployment.url || data.inspectorUrl || deployment.inspectorUrl || "";
    process.stdout.write(rawUrl);
  '
)"

if [[ -z "${deployment_url}" ]]; then
  echo "Error: failed to parse deployment URL from Vercel response." >&2
  printf '%s\n' "${deployment_json}" >&2
  exit 1
fi

if [[ "${deployment_url}" != https://* ]]; then
  deployment_url="https://${deployment_url}"
fi

notes_file="${project_root}/DEPLOYMENTS.md"

if [[ ! -f "${notes_file}" ]]; then
  cat > "${notes_file}" <<'EOF'
# Deployment Notes

每次发到 Vercel 的版本都在这里补一条简短说明，方便和 Deployments 列表对应起来。
EOF
fi

cat >> "${notes_file}" <<EOF

## ${timestamp_display} · ${environment_label}

- URL: ${deployment_url}
- Compared with previous deployment: ${note}
EOF

echo ""
echo "Deployment ready:"
echo "${deployment_url}"
echo ""
echo "Recorded in ${notes_file}"
