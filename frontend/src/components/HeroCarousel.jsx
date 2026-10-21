'use client';

import { Carousel } from 'react-bootstrap';

// Para usar fotos reais, basta trocar o "imagem" de cada slide
// (arquivo dentro de /public ou URL completa).
const SLIDES = [
  {
    imagem: '/carrossel/piloto.svg',
    alt: 'Capacete de um piloto de LMP3',
    titulo: 'O piloto',
    texto: 'Preparação, foco e comunicação com a equipe antes da largada.',
  },
  {
    imagem: '/carrossel/carro-lmp3.svg',
    alt: 'Protótipo LMP3 em alta velocidade',
    titulo: 'O protótipo',
    texto: 'Aerodinâmica e confiabilidade para encarar horas de prova.',
  },
  {
    imagem: '/carrossel/vitoria.svg',
    alt: 'Pódio com troféu e bandeira quadriculada',
    titulo: 'A vitória',
    texto: 'Bandeirada, pódio e o resultado de todo o trabalho em equipe.',
  },
];

export default function HeroCarousel() {
  return (
    <Carousel fade interval={4500} className="carrossel-lmp3 mb-5">
      {SLIDES.map((slide) => (
        <Carousel.Item key={slide.titulo}>
          <img className="d-block w-100 carrossel-imagem" src={slide.imagem} alt={slide.alt} />
          <Carousel.Caption className="carrossel-legenda">
            <h3 className="fw-bold">{slide.titulo}</h3>
            <p className="mb-0">{slide.texto}</p>
          </Carousel.Caption>
        </Carousel.Item>
      ))}
    </Carousel>
  );
}
