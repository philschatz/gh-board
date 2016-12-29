#!/bin/bash
npm run-script dev-build || exit 1

npm run-script run-ava || exit 1

# This script returns 42 if successful so that parallelshell shuts down selenium-manager
exit 42
