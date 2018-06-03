#!/bin/bash
npm run-script dev-build || exit 1

npm run-script test:only || exit 1
