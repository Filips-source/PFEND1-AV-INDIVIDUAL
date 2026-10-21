// Inicia Next.js (3000) e Express (3001) em um único comando.
const { spawn } = require("node:child_process");
const path = require("node:path");

const raiz = path.resolve(__dirname, "..");
const comando = process.platform === "win32" ? "npm.cmd" : "npm";
const processos = [];

for (const workspace of ["backend", "frontend"]) {
  const processo = spawn(
    comando,
    ["run", "dev", "--workspace", workspace],
    {
      cwd: raiz,
      stdio: "inherit",
      shell: process.platform === "win32",
    }
  );

  processos.push(processo);
  processo.on("error", (erro) => {
    console.error(`Não foi possível iniciar ${workspace}:`, erro.message);
    encerrar();
    process.exitCode = 1;
  });
  processo.on("exit", (codigo) => {
    if (codigo && codigo !== 0) {
      console.error(`O processo ${workspace} terminou com código ${codigo}.`);
      encerrar();
      process.exitCode = codigo;
    }
  });
}

let encerrando = false;
function encerrar() {
  if (encerrando) return;
  encerrando = true;
  for (const processo of processos) {
    if (!processo.killed) processo.kill();
  }
}

process.on("SIGINT", encerrar);
process.on("SIGTERM", encerrar);
