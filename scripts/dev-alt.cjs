// Runs `next dev` on port 3100 with its own build folder, for when another
// dev server is already using .next in this checkout.
const { spawn } = require('child_process')
const p = spawn(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['next', 'dev', '-p', '3100'], {
  cwd: require('path').join(__dirname, '..'), stdio: 'inherit', shell: process.platform === 'win32', env: { ...process.env, NEXT_DIST_DIR: '.next-alt', NODE_ENV: 'development' },
})
p.on('exit', code => process.exit(code ?? 0))
