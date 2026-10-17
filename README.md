# Batalha das Urnas — projeto inicial

## O que já está incluído
- Página visual das urnas copiada para `public/index.html`.
- Servidor Node.js/Express.
- Endpoint `/api/state` e atualizações em tempo real via `/api/events`.
- Conector comunitário não oficial para eventos do TikTok LIVE.
- Contagem restrita a IDs de presentes configurados e deduplicação básica de eventos.
- Rotas administrativas protegidas por `ADMIN_TOKEN` para ajuste de placar e cronômetro.

## Configuração para publicar
Configure variáveis de ambiente no serviço de hospedagem:
- `TIKTOK_USERNAME`: usuário da LIVE, sem `@`.
- `ADMIN_TOKEN`: senha longa criada para administrar o placar.
- `RED_GIFT_IDS`: IDs separados por vírgula dos presentes que pontuam para o lado azul/22.
- `WHITE_GIFT_IDS`: IDs separados por vírgula dos presentes que pontuam para o lado vermelho/13.
- `PORT`: normalmente fornecida automaticamente pela hospedagem.

## Importante sobre presentes reais
Este projeto **não deve ser considerado integrado até ser testado em uma LIVE real**. O conector é de terceiros, não uma API oficial garantida pelo TikTok. Os IDs exatos dos presentes devem ser confirmados no fluxo real antes de ativar a contagem; nomes como “rosa branca” podem variar conforme o presente disponível/região. Não configure IDs por suposição.

## Rodar
`npm install` e depois `npm start` (Node.js 18+).
