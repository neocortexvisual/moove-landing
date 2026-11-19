# Moove

Landing page do projeto de transporte estudantil de Coruripe, feita com Astro e React.

```sh
npm ci
npm run dev
```

Use Node.js 22.12 ou superior. Para gerar a página estática, execute `npm run build`.

| Seção | Conteúdo | Código | Imagens |
| --- | --- | --- | --- |
| 1 | Abertura do projeto | `src/secoes/1` | `public/imagens/1` |
| 1.1 | Transição com os recursos do aplicativo | `src/secoes/1.1` | `public/imagens/1.1` |
| 2 | Relatos e carrossel React | `src/secoes/2` | `public/imagens/2` |
| 3 | Dados do transporte | `src/secoes/3` | `public/imagens/3` |
| 4 | Sobre nós | `src/secoes/4` | `public/imagens/4` |

Copie `.env.example` para `.env` e preencha os endereços oficiais dos botões e links. O Astro usa esses endereços durante o build. Enquanto estiverem vazios, os botões exibem avisos de disponibilidade. Os relatos do carrossel são exemplos e os indicadores aguardam valores do piloto.
