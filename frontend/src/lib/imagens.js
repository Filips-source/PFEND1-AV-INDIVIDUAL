export function prepararImagens(noticia) {
  const imagens = Array.isArray(noticia.imagens)
    ? noticia.imagens : [noticia.imagem || ''];

  return [0, 1, 2].map((indice) =>
    typeof imagens[indice] === 'string' ? imagens[indice].trim() : '');
}
