#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:3000}"

function expect_redirect_to_login() {
  local path="$1"
  local location
  location="$(curl -sI "${BASE_URL}${path}" | awk 'BEGIN{IGNORECASE=1}/^location:/{print $2}' | tr -d '\r')"

  if [[ "${location}" != "/login" ]]; then
    echo "Expected ${path} to redirect to /login, got: ${location:-<none>}"
    exit 1
  fi
}

function expect_contains() {
  local path="$1"
  local expected="$2"
  local body
  body="$(curl -sL "${BASE_URL}${path}")"

  if [[ "${body}" != *"${expected}"* ]]; then
    echo "Expected ${path} to contain: ${expected}"
    exit 1
  fi
}

expect_redirect_to_login "/dashboard"
expect_redirect_to_login "/today"
expect_redirect_to_login "/history"
expect_redirect_to_login "/trends"
expect_redirect_to_login "/settings"

expect_contains "/" "进入体验"
expect_contains "/experience" "Guest Mode"
expect_contains "/login" "登录你的健康空间"
expect_contains "/register" "创建你的健康账号"

echo "Smoke checks passed for ${BASE_URL}"
