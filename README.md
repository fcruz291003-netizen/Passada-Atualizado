# Passada — app Android (APK)

App de corrida: GPS ao vivo, voz a cada km, Modo prova, agenda, provas cadastradas, recordes, conquistas e arte para compartilhar.
A interface é a mesma do protótipo (`www/index.html`), empacotada com Capacitor. A pasta `www/native.js` liga o app aos recursos do celular (voz, tela acesa, vibração, compartilhar).

> **Estado:** os arquivos foram montados e a ponte nativa foi testada no navegador com plugins simulados.
> O APK **ainda não foi compilado nem aberto num celular**. Se o build falhar, copie a mensagem de erro e envie ao Claude.

## Caminho mais fácil: gerar o APK no GitHub (sem instalar nada)

1. Crie um repositório no GitHub (pode ser privado) e envie esta pasta inteira (`git push` ou "Upload files" no site).
2. No repositório, abra **Actions → Gerar APK → Run workflow** (também roda sozinho a cada push na `main`).
3. Quando terminar (uns 5 a 10 minutos), abra a execução e baixe **passada-apk** no fim da página. Dentro do zip está `passada-debug.apk`.
4. Passe o APK para o celular, abra e permita "instalar apps desconhecidos" quando o Android pedir.
5. Na primeira corrida, aceite a permissão de localização (de preferência "Durante o uso do app").

## Build no computador (opcional)

Requer Node 20+, Java 21 e Android SDK (`ANDROID_HOME`).

```
npm install --legacy-peer-deps
bash scripts/build-apk.sh
```

O APK sai em `dist/passada-debug.apk`. Para abrir no Android Studio: `npx cap open android`.

## Atualizar o app

Troque o `www/index.html` pela versão nova do protótipo (mantendo a linha `<script src="native.js"></script>` antes do primeiro `<script>`) e faça push.

## O que muda em relação ao protótipo no navegador

- Voz, vibração, tela acesa e compartilhamento usam recursos nativos do Android.
- Contas, ranking entre pessoas e a conversa com o Treinador IA dependem de um servidor próprio e de uma chave de API. No APK ficam desligados; o resto funciona offline, com os dados salvos no aparelho (use Ajustes › backup para guardá-los).
- O rastreamento usa `@capacitor-community/background-geolocation` com notificação persistente e serviço de localização em primeiro plano no Android. A dependência está incluída e o modo `android.useLegacyBridge` está ativado para evitar a interrupção conhecida após alguns minutos em segundo plano.
- O Android solicitará permissão de localização e, em versões recentes, notificações. Inicie a corrida com o app aberto e permita a notificação de rastreamento. Não force o encerramento do Passada; restrições de bateria do fabricante ou o encerramento forçado pelo usuário podem interromper qualquer serviço.
- O filtro de distância entre pontos foi reduzido de 4 m para 1,5 m, e a leitura GPS não aceita posições em cache. Isso diminui o atraso visual sem somar pequenos ruídos de localização como distância.
- Mapa de ruas: usa blocos do OpenStreetMap (precisa de internet, sem chave de API). Aparece ao vivo, no resumo e no detalhe da corrida. Para uso intenso, troque `TILE_URL` em `www/index.html` por um provedor de mapas com chave (MapTiler, Stadia etc.), pois o servidor público do OSM limita o uso. No modo demonstração o mapa mostra um local fixo (Fortaleza) só para teste.
- Ainda não existem: pausa automática e assinatura para publicar na Play Store (o APK gerado é de teste).


## Treinador IA (Gemini Flash)

A conversa do Treinador IA usa a função `api/coach.js` hospedada no Vercel. A chave do Gemini fica somente no servidor e nunca deve ser incluída no HTML, no APK ou no GitHub.

### Configuração no Vercel

1. Abra o projeto `passada-app-corridas-caminhadas` no Vercel.
2. Entre em **Settings → Environment Variables**.
3. Crie `GEMINI_API_KEY` com a chave gerada no Google AI Studio. Marque Production e Preview.
4. Salve a variável e faça um novo deploy depois de enviar estes arquivos ao repositório conectado.
5. Abra `https://passada-app-corridas-caminhadas.vercel.app/api/coach` no navegador. O campo `configured` deve aparecer como `true`.

O aplicativo chama essa URL pelo HTTPS. O endpoint usa `gemini-3.8-flash`, limita o tamanho do histórico e aplica um limite simples por endereço IP. A conversa responde em uma única resposta completa; não há streaming nesta versão.

**Importante:** esta primeira integração habilita a conversa com o Gemini e envia o contexto das corridas/metas. A execução automática de ações como criar treinos na agenda ou alterar metas ainda não está conectada ao modelo.
