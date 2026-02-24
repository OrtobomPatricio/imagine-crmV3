$env:NODE_ENV="development"
$env:PORT="3000"
cd $PSScriptRoot
pnpm exec tsx server/_core/index.ts
