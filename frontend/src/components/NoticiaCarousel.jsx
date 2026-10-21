'use client';

import Carousel from 'react-bootstrap/Carousel';
import { prepararImagens } from '../lib/imagens';

const IMAGEM_PADRAO = '/lmp3.svg';

export default function NoticiaCarousel({ noticia, detalhe = false }) {
  const imagens = prepararImagens(noticia)
    .map((src, indice) => ({ src, numero: indice + 1 }))
    .filter((imagem) => imagem.src);
  const slides = imagens.length ? imagens : [{ src: IMAGEM_PADRAO, numero: 1 }];
  const variasImagens = slides.length > 1;

  return (
    <Carousel
      key={JSON.stringify(slides)}
      className={`noticia-carrossel${detalhe ? ' noticia-carrossel-detalhe mb-3' : ''}`}
      interval={null}
      controls={variasImagens}
      indicators={variasImagens}
      prevLabel="Imagem anterior"
      nextLabel="Próxima imagem"
      indicatorLabels={slides.map((imagem) => `Mostrar imagem ${imagem.numero}`)}
      role="region"
      aria-roledescription="carrossel"
      aria-label={`Imagens da notícia: ${noticia.titulo}`}
    >
      {slides.map((imagem) => (
        <Carousel.Item key={imagem.numero}>
          {/* biome-ignore lint/performance/noImgElement: Os links podem vir de qualquer domínio informado pelo usuário. */}
          <img
            className="d-block w-100 noticia-imagem"
            src={imagem.src}
            alt={`Imagem ${imagem.numero} da notícia: ${noticia.titulo}`}
            onError={(evento) => {
              if (evento.currentTarget.getAttribute('src') !== IMAGEM_PADRAO) {
                evento.currentTarget.src = IMAGEM_PADRAO;
              }
            }}
          />
        </Carousel.Item>
      ))}
    </Carousel>
  );
}
