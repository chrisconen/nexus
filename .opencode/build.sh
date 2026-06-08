#!/bin/bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
nvm use 24
cd "$HOME/projects/nexus"
pnpm build 2>&1
echo "BUILD_EXIT_CODE=$?"
