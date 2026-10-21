const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { createServer } = require('node:net');
const { mkdtemp, readFile, writeFile, rename, mkdir, rm } = require('node:fs/promises');
const { tmpdir } = require('node:os');
const path = require('node:path');
const { setTimeout: esperar } = require('node:timers/promises');

const CAMINHO_SERVIDOR = path.join(__dirname, 'server.js');

async function removerDiretorioTeste(diretorio) {
  const destino = path.resolve(diretorio);
  assert.equal(path.dirname(destino), path.resolve(tmpdir()));
  assert.match(path.basename(destino), /^lmp3-(persistencia|json-invalido)-/);
  await rm(destino, { recursive: true, force: true });
}

async function obterPortaLivre() {
  const servidor = createServer();
  await new Promise((resolve, reject) => {
    servidor.once('error', reject);
    servidor.listen(0, '127.0.0.1', resolve);
  });
  const porta = servidor.address().port;
  await new Promise((resolve, reject) => servidor.close((erro) => erro ? reject(erro) : resolve()));
  return porta;
}

async function criarProcesso(arquivo) {
  const porta = await obterPortaLivre();
  const processo = spawn(process.execPath, [CAMINHO_SERVIDOR], {
    cwd: __dirname,
    env: { ...process.env, PORT: String(porta), ARQUIVO_NOTICIAS: arquivo },
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });
  const instancia = {
    processo,
    url: `http://127.0.0.1:${porta}/api/noticias`,
    log: '',
    resultado: null,
    erro: null,
  };
  const registrar = (dados) => { instancia.log += dados.toString(); };
  processo.stdout.on('data', registrar);
  processo.stderr.on('data', registrar);
  instancia.encerrado = new Promise((resolve) => {
    processo.once('exit', (codigo, sinal) => {
      instancia.resultado = { codigo, sinal };
      resolve();
    });
    processo.once('error', (erro) => {
      instancia.erro = erro;
      resolve();
    });
  });
  return instancia;
}

async function aguardarEncerramento(instancia) {
  await Promise.race([
    instancia.encerrado,
    esperar(5000, undefined, { ref: false }).then(() => {
      throw new Error(`A API de teste não encerrou.\n${instancia.log}`);
    }),
  ]);
}

async function pararServidor(instancia) {
  if (!instancia || instancia.resultado || instancia.erro) return;
  instancia.processo.kill();
  await aguardarEncerramento(instancia);
}

async function iniciarServidor(arquivo) {
  const instancia = await criarProcesso(arquivo);
  try {
    const limite = Date.now() + 10000;
    while (Date.now() < limite) {
      if (instancia.resultado || instancia.erro) {
        throw new Error(`A API de teste falhou ao iniciar.\n${instancia.log}`, { cause: instancia.erro });
      }
      try {
        const resposta = await fetch(instancia.url, { signal: AbortSignal.timeout(500) });
        await resposta.arrayBuffer();
        if (resposta.ok) return instancia;
      } catch {
        // A porta pode ainda não estar aberta durante a inicialização.
      }
      await esperar(40);
    }
    throw new Error(`A API de teste não ficou disponível.\n${instancia.log}`);
  } catch (erro) {
    await pararServidor(instancia);
    throw erro;
  }
}

async function requisitar(instancia, metodo = 'GET', rota = '', dados, status = 200) {
  const resposta = await fetch(`${instancia.url}${rota}`, {
    method: metodo,
    ...(dados === undefined ? {} : {
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados),
    }),
    signal: AbortSignal.timeout(3000),
  });
  const texto = await resposta.text();
  assert.equal(resposta.status, status, `${metodo} ${rota}: ${texto}`);
  assert.match(resposta.headers.get('content-type') || '', /application\/json/);
  return JSON.parse(texto);
}

function novaNoticia() {
  return {
    titulo: 'Notícia de teste de persistência',
    categoria: 'LMP3',
    resumo: 'Resumo usado somente pela API de teste.',
    conteudo: 'Conteúdo salvo em um diretório temporário isolado.',
    data: '2026-10-21',
    imagens: [
      'https://example.com/imagem-1.jpg',
      'https://example.com/imagem-2.jpg',
      'https://example.com/imagem-3.jpg',
    ],
  };
}

test('preserva notícias e imagens entre reinícios e rejeita alterações quando a gravação falha', { timeout: 90000 }, async () => {
  const diretorio = await mkdtemp(path.join(tmpdir(), 'lmp3-persistencia-'));
  const arquivo = path.join(diretorio, 'noticias.json');
  let instancia;
  const reiniciar = async () => {
    await pararServidor(instancia);
    instancia = await iniciarServidor(arquivo);
  };

  try {
    await reiniciar();
    const iniciais = await requisitar(instancia);
    assert.ok(Array.isArray(iniciais) && iniciais.length > 0, 'Arquivo ausente deve criar as notícias iniciais.');
    assert.deepEqual(JSON.parse(await readFile(arquivo, 'utf8')), iniciais);

    const dados = novaNoticia();
    const criada = await requisitar(instancia, 'POST', '', dados, 201);
    assert.ok(Number.isInteger(criada.id));
    assert.deepEqual(criada.imagens, dados.imagens);
    await reiniciar();
    assert.deepEqual((await requisitar(instancia)).find((noticia) => noticia.id === criada.id), criada);

    const imagensEditadas = ['', 'https://example.com/nova-imagem-2.jpg', ''];
    const editada = await requisitar(instancia, 'PUT', `/${criada.id}`, {
      ...criada,
      titulo: 'Notícia editada e persistida',
      imagens: imagensEditadas,
    });
    assert.deepEqual(editada.imagens, imagensEditadas, 'Os campos vazios devem manter suas posições.');
    assert.equal(editada.imagem, imagensEditadas[1]);
    await reiniciar();
    assert.deepEqual((await requisitar(instancia)).find((noticia) => noticia.id === criada.id), editada);

    await requisitar(instancia, 'DELETE', `/${criada.id}`);
    await reiniciar();
    assert.equal((await requisitar(instancia)).some((noticia) => noticia.id === criada.id), false);

    await pararServidor(instancia);
    instancia = undefined;
    await writeFile(arquivo, '[]', 'utf8');
    await reiniciar();
    assert.deepEqual(await requisitar(instancia), [], 'Uma lista vazia salva não deve recriar os exemplos.');
    await reiniciar();
    assert.deepEqual(await requisitar(instancia), []);

    const preservada = await requisitar(instancia, 'POST', '', novaNoticia(), 201);
    const antesDaFalha = await requisitar(instancia);
    const copia = `${arquivo}.backup`;
    await rename(arquivo, copia);
    await mkdir(arquivo);

    for (const [metodo, rota, corpo] of [
      ['POST', '', novaNoticia()],
      ['PUT', `/${preservada.id}`, { ...preservada, titulo: 'Esta mudança deve falhar' }],
      ['DELETE', `/${preservada.id}`, undefined],
    ]) {
      const erro = await requisitar(instancia, metodo, rota, corpo, 500);
      assert.equal(typeof erro.erro, 'string');
      assert.ok(erro.erro.length > 0);
      assert.deepEqual(await requisitar(instancia), antesDaFalha, `${metodo} com falha não deve alterar a memória.`);
    }
    assert.deepEqual(JSON.parse(await readFile(copia, 'utf8')), antesDaFalha);

    assert.equal(path.dirname(path.resolve(arquivo)), path.resolve(diretorio));
    await rm(arquivo, { recursive: true });
    await rename(copia, arquivo);
    const recuperada = await requisitar(instancia, 'POST', '', novaNoticia(), 201);
    assert.equal(recuperada.id, preservada.id + 1, 'Uma criação que falhou não deve consumir o próximo ID.');
    await reiniciar();
    assert.deepEqual(await requisitar(instancia), [...antesDaFalha, recuperada]);
  } finally {
    await pararServidor(instancia);
    await removerDiretorioTeste(diretorio);
  }
});

test('arquivo malformado ou com estrutura inválida impede a inicialização sem sobrescrever os dados', { timeout: 30000 }, async () => {
  const diretorio = await mkdtemp(path.join(tmpdir(), 'lmp3-json-invalido-'));
  const arquivo = path.join(diretorio, 'noticias.json');
  let instancia;
  try {
    for (const conteudo of ['{"noticias":', '{"noticias":[]}', '[{"id":1}]']) {
      await writeFile(arquivo, conteudo, 'utf8');
      instancia = await criarProcesso(arquivo);
      await aguardarEncerramento(instancia);
      assert.equal(instancia.erro, null, 'O processo Node deve iniciar para que a validação do arquivo seja exercitada.');
      assert.notEqual(instancia.resultado?.codigo, 0, `O arquivo inválido deve impedir a inicialização: ${conteudo}`);
      assert.equal(await readFile(arquivo, 'utf8'), conteudo);
    }
  } finally {
    await pararServidor(instancia);
    await removerDiretorioTeste(diretorio);
  }
});
