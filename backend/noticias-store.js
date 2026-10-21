const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');

function salvarNoticias(arquivo, noticias) {
  fs.mkdirSync(path.dirname(arquivo), { recursive: true });
  const temporario = `${arquivo}.${randomUUID()}.tmp`;

  try {
    fs.writeFileSync(temporario, `${JSON.stringify(noticias, null, 2)}\n`, {
      encoding: 'utf8',
      flag: 'wx',
    });
    fs.renameSync(temporario, arquivo);
  } finally {
    if (fs.existsSync(temporario)) fs.unlinkSync(temporario);
  }
}

function carregarNoticias(arquivo, iniciais) {
  let conteudo;
  try {
    conteudo = fs.readFileSync(arquivo, 'utf8');
  } catch (erro) {
    if (erro.code !== 'ENOENT') throw erro;
    salvarNoticias(arquivo, iniciais);
    return iniciais;
  }

  const noticias = JSON.parse(conteudo);
  if (!Array.isArray(noticias)) {
    throw new Error(`O arquivo ${arquivo} deve conter uma lista de notícias.`);
  }
  return noticias;
}

module.exports = { carregarNoticias, salvarNoticias };
