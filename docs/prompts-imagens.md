# Prompts das imagens do dashboard

O dashboard já funciona sem as imagens: no lugar de cada uma aparece um quadro verde com o nome do arquivo esperado.
Quando gerar, salve em **`dashboard/public/img/`** com o **nome exato** da tabela. Não precisa mexer no código.

## Regras para todas as fotos

- **Paleta:** off-white (#F3F0E7) e verde-escuro (#1F5C3F), com o amarelo do sol (#F2B705) como destaque. Luz quente de meio-dia.
- **Sem rosto reconhecível** e **sem logotipo real** (nada de empresa de coleta, prefeitura, marca de caminhão ou de uniforme). As pessoas aparecem de costas, de longe ou cortadas.
- **Sem texto na imagem** (os geradores escrevem errado). O texto fica no site.
- **Formato:** exporte em **WebP** (ou PNG e converta em [squoosh.app](https://squoosh.app)), qualidade 75 a 80, no tamanho da tabela.
- **Crédito:** o rodapé já diz que as fotos do site são geradas com IA. Não usem fotos dos garis entrevistados.

| Arquivo | Onde aparece | Tamanho | Proporção |
|---|---|---|---|
| `hero-coleta.webp` | Abertura do Início, ocupa a tela inteira; o texto fica à **esquerda** | 2400 × 1350 | 16:9 |
| `problema-sol.webp` | Cartão "O sol do meio-dia" | 1200 × 900 | 4:3 |
| `problema-pausa.webp` | Cartão "Ninguém para" | 1200 × 900 | 4:3 |
| `problema-agua.webp` | Cartão "A água esquenta e acaba" | 1200 × 900 | 4:3 |
| `banner-final.webp` | Faixa final do Início, escurece até o rodapé; texto à **esquerda** | 2400 × 1000 | 12:5 |

## 1. `hero-coleta.webp`

> Wide cinematic photograph of a Brazilian city street at midday, harsh overhead sun, a garbage collection truck seen from behind in the right half of the frame, two sanitation workers in plain green work uniforms and caps running beside it, seen from behind, motion blur on their legs, heat haze rising from the asphalt, bright off-white sky, warm golden light, deep green shadows, the left 45% of the image is calm and simple (sky and building wall) to leave room for text, no faces visible, no logos, no text, no license plates, photorealistic, 16:9

## 2. `problema-sol.webp`

> Close-up photograph of a gloved hand lifting a heavy black garbage bag from a hot sidewalk at noon, intense sunlight, short hard shadows, heat shimmer over the asphalt, a small sweat drop on the forearm, green work glove and green sleeve, warm off-white and green palette, shallow depth of field, no face, no logos, no text, photorealistic, 4:3

## 3. `problema-pausa.webp`

> Photograph of the rear step of a garbage collection truck on a sunny street, one worker in a plain green uniform holding the rear handle while the truck moves, seen from behind and slightly from the side, the shade of a big tree a few meters ahead on the sidewalk, the feeling of a rest that does not happen, warm midday light, off-white and deep green tones, no face visible, no logos, no text, no license plate, photorealistic, 4:3

## 4. `problema-agua.webp`

O galão fica **dentro da cabine** do caminhão, não no compartimento do lixo ("por ficar dentro do caminhão, ela esquenta muito", Jackson).

> Photograph inside the cab of a garbage collection truck at midday, a plain blue 20-liter water jug standing on the floor between the seats, strong sunlight coming through the windshield and hitting the jug directly, the water level visibly low, a single plastic cup beside it, dashboard and seats slightly out of focus, hot and stuffy atmosphere, warm light, off-white and deep green color palette, shallow depth of field, no people, no logos, no brand names, no text, photorealistic, 4:3

## 5. `banner-final.webp`

> Wide photograph of a quiet tree-lined street at the end of the afternoon, a garbage truck parked in the shade of large trees, two sanitation workers in plain green uniforms sitting in the shade drinking water, seen from behind at a distance, soft golden light, calm and relieved mood, off-white sky, deep green foliage that gets darker toward the bottom of the image, the left half is simpler for text, no faces, no logos, no text, no license plate, photorealistic, 12:5

## 6. Logo (feito)

O grupo gerou o logo (casa, pessoa com coração e mãos) e ele foi redesenhado em SVG: `docs/imagens/pausacerta-logo.svg`.
O prompt abaixo foi o ponto de partida.

O símbolo atual é provisório e desenhado no código (`dashboard/src/components/Marca.jsx` e `dashboard/public/favicon.svg`):
quadrado verde, sinal de pausa off-white e um sol amarelo no canto. Para um logo de verdade:

> Minimal flat vector logo symbol for a product called "Pausa Certa", a rounded square in deep green #1F5C3F containing a bold pause sign (two vertical rounded bars) in off-white #F3F0E7, with a small sun in yellow #F2B705 rising behind the right bar, simple geometric shapes, no gradients, no text, works at 32 pixels, centered on a plain off-white background, vector style

Gere 3 ou 4 variações e escolham uma. **Me mandem a imagem escolhida**: eu redesenho em SVG (fica nítido em qualquer tamanho, como fizemos no WineGuard)
e troco o símbolo do site, o favicon e a marca do rodapé.
