import { useState } from 'react';

const exemplos = [
  'Não sei se o ônibus já passou pelo meu ponto.',
  'Queria saber quando a rota muda.',
  'Seria bom receber um aviso quando o ônibus atrasa.',
  'Tenho dificuldade para encontrar o ponto de embarque.',
];

export default function Carrossel() {
  const [atual, setAtual] = useState(0);

  function navegar(event) {
    const direcao = { ArrowLeft: -1, ArrowRight: 1 }[event.key];
    if (direcao === undefined) return;

    event.preventDefault();
    const proximo = (atual + direcao + exemplos.length) % exemplos.length;
    setAtual(proximo);
    event.currentTarget.children[proximo].focus();
  }

  return (
    <div className="carousel" aria-label="Exemplos de relatos">
      <figure className="relato-example" aria-live="polite">
        <blockquote>“{exemplos[atual]}”</blockquote>
        <figcaption>Exemplo de relato</figcaption>
      </figure>
      <div className="carousel-controls" role="group" aria-label="Escolher um exemplo" onKeyDown={navegar}>
        {exemplos.map((exemplo, indice) => (
          <button
            key={exemplo}
            type="button"
            aria-label={`Exemplo ${indice + 1} de ${exemplos.length}`}
            aria-pressed={atual === indice}
            onClick={() => setAtual(indice)}
          />
        ))}
      </div>
    </div>
  );
}
