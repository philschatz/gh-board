#!/bin/bash
# Set the flag `--race` to kill all tasks when a task finished with zero.
$(npm bin)/run-p --race "start-selenium" "serve" "build-and-test"
