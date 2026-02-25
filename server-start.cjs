#!/usr/bin/env node
/**
 * Wrapper para iniciar el servidor con tsx
 * Compatible con PM2
 */
const { exec } = require('child_process');
const path = require('path');

const serverPath = path.join(__dirname, 'server', '_core', 'index.ts');
const tsxPath = path.join(__dirname, 'node_modules', '.bin', 'tsx.CMD');

console.log('🚀 Iniciando CRM PRO V4...');
console.log(`   Servidor: ${serverPath}`);

const command = `"${tsxPath}" "${serverPath}"`;

const child = exec(command, {
  env: {
    ...process.env,
    NODE_ENV: process.env.NODE_ENV || 'development',
    PORT: process.env.PORT || '3000'
  }
});

child.stdout.pipe(process.stdout);
child.stderr.pipe(process.stderr);

child.on('exit', (code) => {
  console.log(`Servidor terminado con código: ${code}`);
  process.exit(code);
});

process.on('SIGTERM', () => {
  console.log('Recibido SIGTERM, deteniendo servidor...');
  child.kill('SIGTERM');
});

process.on('SIGINT', () => {
  console.log('Recibido SIGINT, deteniendo servidor...');
  child.kill('SIGINT');
});
