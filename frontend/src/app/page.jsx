'use client';

import { useEffect, useState } from 'react';
import {
  Alert, Badge, Button, Card, Col, Container,
  Form, Modal, Row, Spinner,
} from 'react-bootstrap';
import NoticiaCarousel from '../components/NoticiaCarousel';
import { prepararImagens } from '../lib/imagens';

const API = 'http://localhost:3001/api/noticias';
const FORM_INICIAL = {
  titulo: '',
  categoria: 'LMP3',
  resumo: '',
  conteudo: '',
  data: new Date().toISOString().slice(0, 10),
  imagens: ['', '', ''],
};

async function requisicao(url, opcoes = {}) {
  const resposta = await fetch(url, opcoes);
  const dados = await resposta.json();
  if (!resposta.ok) throw new Error(dados.erro || 'Não foi possível concluir a operação.');
  return dados;
}

function formatarData(data) {
  return new Date(`${data}T12:00:00`).toLocaleDateString('pt-BR');
}

export default function Home() {
  const [noticias, setNoticias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');
  const [selecionada, setSelecionada] = useState(null);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [form, setForm] = useState(FORM_INICIAL);
  const [erroFormulario, setErroFormulario] = useState('');
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    const controlador = new AbortController();
    async function carregarNoticias() {
      try {
        const dados = await requisicao(API, { signal: controlador.signal });
        setNoticias(dados);
      } catch (e) {
        if (e.name !== 'AbortError') {
          setErro('Não foi possível carregar as notícias. Verifique se a API está ligada na porta 3001.');
        }
      } finally {
        if (!controlador.signal.aborted) setLoading(false);
      }
    }
    carregarNoticias();
    return () => controlador.abort();
  }, []);

  function abrirFormulario(noticia = null) {
    setEditandoId(noticia?.id ?? null);
    setForm(noticia ? {
      titulo: noticia.titulo,
      categoria: noticia.categoria,
      resumo: noticia.resumo,
      conteudo: noticia.conteudo,
      data: noticia.data,
      imagens: prepararImagens(noticia),
    } : { ...FORM_INICIAL, imagens: ['', '', ''], data: new Date().toISOString().slice(0, 10) });
    setErroFormulario('');
    setMostrarFormulario(true);
  }

  async function salvarNoticia(evento) {
    evento.preventDefault();
    setErroFormulario('');
    setSalvando(true);
    const editando = editandoId !== null;

    try {
      const noticiaSalva = await requisicao(editando ? `${API}/${editandoId}` : API, {
        method: editando ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      setNoticias((atuais) => editando
        ? atuais.map((noticia) => noticia.id === editandoId ? noticiaSalva : noticia)
        : [noticiaSalva, ...atuais]);
      setMostrarFormulario(false);
      setSucesso(editando ? 'Notícia atualizada com sucesso!' : 'Notícia cadastrada com sucesso!');
      setErro('');
    } catch (e) {
      setErroFormulario(e.message === 'Failed to fetch'
        ? 'Não foi possível conectar com a API.' : e.message);
    } finally {
      setSalvando(false);
    }
  }

  async function excluirNoticia(noticia) {
    if (!window.confirm(`Deseja realmente excluir "${noticia.titulo}"?`)) return;
    setErro('');
    setSucesso('');

    try {
      await requisicao(`${API}/${noticia.id}`, { method: 'DELETE' });
      setNoticias((atuais) => atuais.filter((item) => item.id !== noticia.id));
      setSucesso('Notícia excluída com sucesso!');
    } catch (e) {
      setErro(e.message === 'Failed to fetch'
        ? 'Não foi possível conectar com a API.' : e.message);
    }
  }

  return (
    <>
      <header className="hero-lmp3 text-white py-5 mb-4">
        <Container>
          <Badge bg="danger" className="mb-3">AUTOMOBILISMO • ENDURANCE</Badge>
          <h1 className="display-5 fw-bold mb-2">LMP3 NEWS</h1>
          <p className="lead mb-4">Notícias e análises do universo dos protótipos LMP3.</p>
          <Button variant="danger" onClick={() => abrirFormulario()}>
            + Cadastrar notícia
          </Button>
        </Container>
      </header>

      <Container className="pb-5">
        <h2 className="h4 text-white mb-4">Catálogo de notícias</h2>

        {erro && <Alert variant="danger" onClose={() => setErro('')} dismissible>{erro}</Alert>}
        {sucesso && <Alert variant="success" onClose={() => setSucesso('')} dismissible>{sucesso}</Alert>}

        {loading ? (
          <output className="d-block text-center py-5">
            <Spinner animation="border" variant="danger" />
            <span className="d-block text-white mt-3">Carregando notícias...</span>
          </output>
        ) : noticias.length === 0 ? (
          <Alert variant="secondary">Nenhuma notícia cadastrada.</Alert>
        ) : (
          <Row className="g-4">
            {noticias.map((noticia) => (
              <Col key={noticia.id} xs={12} md={6} lg={4}>
                <Card className="noticia-card h-100 text-white">
                  <NoticiaCarousel noticia={noticia} />
                  <Card.Body className="d-flex flex-column">
                    <div className="mb-2">
                      <Badge bg="danger" className="me-2">{noticia.categoria}</Badge>
                      <span className="small text-secondary-emphasis">{formatarData(noticia.data)}</span>
                    </div>
                    <Card.Title className="fw-bold">{noticia.titulo}</Card.Title>
                    <Card.Text className="text-light-emphasis">{noticia.resumo}</Card.Text>
                    <div className="mt-auto pt-3">
                      <Button variant="danger" className="w-100 mb-2" onClick={() => setSelecionada(noticia)}>
                        Saiba mais
                      </Button>
                      <div className="d-flex gap-2">
                        <Button variant="outline-light" size="sm" className="flex-fill" onClick={() => abrirFormulario(noticia)}>
                          Editar
                        </Button>
                        <Button variant="outline-danger" size="sm" className="flex-fill" onClick={() => excluirNoticia(noticia)}>
                          Excluir
                        </Button>
                      </div>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            ))}
          </Row>
        )}
      </Container>

      <Modal show={selecionada !== null} onHide={() => setSelecionada(null)} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>{selecionada?.titulo}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selecionada && (
            <>
              <NoticiaCarousel noticia={selecionada} detalhe />
              <Badge bg="danger" className="mb-2">{selecionada.categoria}</Badge>
              <p className="text-muted small">Publicado em {formatarData(selecionada.data)}</p>
              <p style={{ whiteSpace: 'pre-line' }}>{selecionada.conteudo}</p>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setSelecionada(null)}>Fechar</Button>
        </Modal.Footer>
      </Modal>

      <Modal show={mostrarFormulario} onHide={() => !salvando && setMostrarFormulario(false)} centered size="lg">
        <Form onSubmit={salvarNoticia}>
          <Modal.Header closeButton>
            <Modal.Title>{editandoId !== null ? 'Editar notícia' : 'Cadastrar notícia'}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {erroFormulario && <Alert variant="danger">{erroFormulario}</Alert>}
            <Form.Group className="mb-3" controlId="titulo">
              <Form.Label>Título</Form.Label>
              <Form.Control required maxLength={150} value={form.titulo}
                onChange={(e) => setForm({ ...form, titulo: e.target.value })} />
            </Form.Group>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3" controlId="categoria">
                  <Form.Label>Categoria</Form.Label>
                  <Form.Control value={form.categoria} readOnly />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3" controlId="data">
                  <Form.Label>Data</Form.Label>
                  <Form.Control type="date" required value={form.data}
                    onChange={(e) => setForm({ ...form, data: e.target.value })} />
                </Form.Group>
              </Col>
            </Row>
            <Form.Group className="mb-3" controlId="resumo">
              <Form.Label>Resumo</Form.Label>
              <Form.Control as="textarea" rows={2} required maxLength={300} value={form.resumo}
                onChange={(e) => setForm({ ...form, resumo: e.target.value })} />
            </Form.Group>
            <Form.Group className="mb-3" controlId="conteudo">
              <Form.Label>Conteúdo completo</Form.Label>
              <Form.Control as="textarea" rows={5} required value={form.conteudo}
                onChange={(e) => setForm({ ...form, conteudo: e.target.value })} />
            </Form.Group>
            <fieldset>
              <legend className="fs-6">Imagens do carrossel (opcional)</legend>
              <p id="imagens-ajuda" className="small text-body-secondary">
                Adicione até 3 links, na ordem em que as imagens devem aparecer.
                Se deixar todos vazios, aparecerá uma ilustração padrão.
              </p>
              {[1, 2, 3].map((numero) => (
                <Form.Group className="mb-3" controlId={`imagem-${numero}`} key={numero}>
                  <Form.Label>Imagem {numero} (link)</Form.Label>
                  <Form.Control
                    type="text"
                    inputMode="url"
                    placeholder="https://exemplo.com/imagem.jpg"
                    pattern="https?://.+|/[^\x2F].*"
                    title="Informe um link http:// ou https://, ou o caminho de uma imagem do site."
                    aria-describedby="imagens-ajuda"
                    value={form.imagens[numero - 1]}
                    onChange={(evento) => {
                      const link = evento.target.value;
                      setForm((atual) => ({
                        ...atual,
                        imagens: atual.imagens.map((imagem, indice) =>
                          indice === numero - 1 ? link : imagem),
                      }));
                    }}
                  />
                </Form.Group>
              ))}
            </fieldset>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" disabled={salvando} onClick={() => setMostrarFormulario(false)}>Cancelar</Button>
            <Button type="submit" variant="danger" disabled={salvando}>
              {salvando ? 'Salvando...' : 'Salvar notícia'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </>
  );
}
