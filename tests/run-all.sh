#!/usr/bin/env bash
# Run the complete AMCF2026js test suite (Node + headless Chrome).
# Usage:  AMCF_ADMIN_PASSWORD=… ./tests/run-all.sh
set -uo pipefail

cd "$(dirname "$0")/.."
BASE="http://localhost:8000"
SERVER_PID=""

if [ -z "${AMCF_ADMIN_PASSWORD:-}" ]; then
    echo "AMCF_ADMIN_PASSWORD is required for tests/browser.test.js" >&2
    exit 2
fi

if ! curl -fsS "${BASE}/index.html" >/dev/null 2>&1; then
    php -S 127.0.0.1:8000 >/tmp/opencode/amcf-test-server.log 2>&1 &
    SERVER_PID=$!
    trap '[ -n "$SERVER_PID" ] && kill "$SERVER_PID" 2>/dev/null' EXIT
    for _ in $(seq 1 50); do
        curl -fsS "${BASE}/index.html" >/dev/null 2>&1 && break
        sleep 0.2
    done
fi

fail=0
for test in tests/*.test.js; do
    echo "=== ${test}"
    if ! node "${test}"; then
        fail=1
    fi
done

if [ "$fail" -ne 0 ]; then
    echo "SOME TESTS FAILED" >&2
else
    echo "ALL TESTS PASSED"
fi
exit "$fail"
