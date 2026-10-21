const express = require('express');
const cors = require('cors');
const path = require('node:path');
const { carregarNoticias, salvarNoticias } = require('./noticias-store');

const app = express();
const PORT = Number(process.env.PORT || 3001);
const ARQUIVO_NOTICIAS = process.env.ARQUIVO_NOTICIAS
  ? path.resolve(process.env.ARQUIVO_NOTICIAS)
  : path.join(__dirname, '..', 'database', 'noticias.json');

app.use(cors({ origin: 'http://localhost:3000' }));
app.use(express.json());

// Usuários simulados; as notícias são salvas em database/noticias.json.
const usuarios = [
  { id: 1, nome: 'Ana Martins', perfil: 'Admin' },
  { id: 2, nome: 'Lucas Souza', perfil: 'Leitor' },
];

const noticiasIniciais = [
  {
    id: 1,
    titulo: 'LMP3: a importância dos protótipos nas provas de endurance',
    categoria: 'LMP3',
    resumo: 'Entenda por que a categoria LMP3 é uma porta de entrada para as corridas de resistência.',
    conteudo: 'Os protótipos LMP3 são projetados para competições de resistência e desenvolvimento de pilotos e equipes. Eles combinam desempenho, aerodinâmica e trabalho de equipe.\n\nNas corridas de endurance, consistência e confiabilidade são tão importantes quanto a velocidade em uma única volta.',
    data: '2026-10-12',
    imagem: '',
    imagens: ['', '', ''],
  },
  {
    id: 2,
    titulo: 'Estratégia nos boxes pode mudar uma corrida de LMP3',
    categoria: 'LMP3',
    resumo: 'Paradas, pneus e gerenciamento de combustível exigem decisões rápidas da equipe.',
    conteudo: 'Uma corrida de longa duração envolve muito mais que acelerar. As equipes de LMP3 precisam planejar as paradas, acompanhar o desgaste dos pneus e controlar o consumo de combustível.\n\nUma decisão no momento certo pode economizar segundos importantes ao longo da prova.',
    data: '2026-10-09',
    imagem: '',
    imagens: ['', '', ''],
  },
  {
    id: 3,
    titulo: 'Como os pilotos se preparam para competir na LMP3',
    categoria: 'LMP3',
    resumo: 'Treinos, comunicação e adaptação ao tráfego fazem parte da preparação para competir.',
    conteudo: 'O trabalho de um piloto de LMP3 começa antes da largada. A preparação inclui conhecer o circuito, treinar procedimentos e manter comunicação clara com engenheiros e mecânicos.\n\nDurante a prova, o piloto precisa administrar o ritmo e dividir a pista com outros competidores com segurança.',
    data: '2026-10-05',
    imagem: '',
    imagens: ['', '', ''],
  },
];

let noticias = carregarNoticias(ARQUIVO_NOTICIAS, noticiasIniciais);
const ids = new Set();
for (const noticia of noticias) {
  if (!Number.isSafeInteger(noticia?.id) || noticia.id < 1 || ids.has(noticia.id) || validarNoticia(noticia)) {
    throw new Error(`Há uma notícia inválida em ${ARQUIVO_NOTICIAS}. Corrija o arquivo antes de iniciar a API.`);
  }
  ids.add(noticia.id);
}
let proximoId = Math.max(0, ...ids) + 1;

function linkImagemValido(link) {
  if (!link) return true;
  if (link.startsWith('/')) return !link.startsWith('//') && !link.includes('\\');
  if (!/^https?:\/\//i.test(link)) return false;

  try {
    const url = new URL(link);
    return (url.protocol === 'http:' || url.protocol === 'https:') && Boolean(url.hostname);
  } catch {
    return false;
  }
}

function obterImagens(dados) {
  const imagens = dados.imagens === undefined ? [dados.imagem || ''] : dados.imagens;
  return Array.from({ length: 3 }, (_valor, indice) => (imagens[indice] || '').trim());
}

function validarNoticia(dados) {
  const campos = ['titulo', 'categoria', 'resumo', 'conteudo', 'data'];
  for (const campo of campos) {
    if (typeof dados?.[campo] !== 'string' || !dados[campo].trim()) {
      return `O campo ${campo} é obrigatório.`;
    }
  }

  const data = dados.data;
  const dataValida = /^\d{4}-\d{2}-\d{2}$/.test(data) &&
    !Number.isNaN(Date.parse(`${data}T12:00:00`));
  if (!dataValida) return 'Informe uma data válida no formato AAAA-MM-DD.';
  if (dados.imagem != null && typeof dados.imagem !== 'string') {
    return 'O campo imagem deve ser um texto.';
  }
  if (dados.imagens !== undefined) {
    if (!Array.isArray(dados.imagens)) return 'O campo imagens deve ser uma lista.';
    if (dados.imagens.length > 3) return 'Informe no máximo 3 imagens.';
    if (dados.imagens.some((imagem) => typeof imagem !== 'string')) {
      return 'Cada imagem deve ser um texto.';
    }
  }
  if (obterImagens(dados).some((imagem) => !linkImagemValido(imagem))) {
    return 'Informe links de imagens válidos com http://, https:// ou caminhos locais começando com /.';
  }
  return null;
}

function limparNoticia(dados) {
  const imagens = obterImagens(dados);
  return {
    titulo: dados.titulo.trim(),
    categoria: dados.categoria.trim(),
    resumo: dados.resumo.trim(),
    conteudo: dados.conteudo.trim(),
    data: dados.data.trim(),
    imagem: imagens.find(Boolean) || '',
    imagens,
  };
}

function persistirNoticias(atualizadas, res) {
  try {
    salvarNoticias(ARQUIVO_NOTICIAS, atualizadas);
  } catch (erro) {
    console.error('Não foi possível salvar o arquivo de notícias:', erro.message);
    res.status(500).json({ erro: 'Não foi possível salvar as notícias. Verifique o arquivo de dados e tente novamente.' });
    return false;
  }
  noticias = atualizadas;
  return true;
}

app.get('/api/noticias', (_req, res) => res.json(noticias));
app.get('/api/usuarios', (_req, res) => res.json(usuarios));

app.post('/api/noticias', (req, res) => {
  const erro = validarNoticia(req.body);
  if (erro) return res.status(400).json({ erro });

  const noticia = { id: proximoId, ...limparNoticia(req.body) };
  if (!persistirNoticias([...noticias, noticia], res)) return;
  proximoId += 1;
  return res.status(201).json(noticia);
});

app.put('/api/noticias/:id', (req, res) => {
  const id = Number(req.params.id);
  const indice = noticias.findIndex((noticia) => noticia.id === id);
  if (indice === -1) return res.status(404).json({ erro: 'Notícia não encontrada.' });

  const erro = validarNoticia(req.body);
  if (erro) return res.status(400).json({ erro });

  const noticiaAtualizada = { id, ...limparNoticia(req.body) };
  const atualizadas = noticias.map((noticia, posicao) => posicao === indice ? noticiaAtualizada : noticia);
  if (!persistirNoticias(atualizadas, res)) return;
  return res.json(noticiaAtualizada);
});

app.delete('/api/noticias/:id', (req, res) => {
  const id = Number(req.params.id);
  const existe = noticias.some((noticia) => noticia.id === id);
  if (!existe) return res.status(404).json({ erro: 'Notícia não encontrada.' });

  if (!persistirNoticias(noticias.filter((noticia) => noticia.id !== id), res)) return;
  return res.json({ mensagem: 'Notícia excluída com sucesso.' });
});

app.listen(PORT, () => {
  console.log(`API LMP3 disponível em http://localhost:${PORT}`);
});
