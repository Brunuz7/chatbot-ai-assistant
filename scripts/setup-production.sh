#!/bin/bash
# Redireciona para o fluxo Docker de produção.
exec "$(dirname "$0")/docker-prod-up.sh" "$@"
