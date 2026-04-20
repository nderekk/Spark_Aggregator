#!/usr/bin/env bash
set -euo pipefail
nvc -acc -gpu=cc90 -fast -fPIC -shared -o similarity.so similarity.c -lm
