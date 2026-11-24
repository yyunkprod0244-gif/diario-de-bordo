# 🧭 Diário de Bordo

PWA para registrar atividades diárias (título, descrição e data). Funciona offline, pode ser instalado na tela inicial e guarda tudo no navegador com `localStorage`. Feito sem frameworks, com HTML, CSS e JavaScript puros.

## Funcionalidades

- **CRUD:** criar, listar (mais recentes primeiro) e remover entradas, com opção de **desfazer** a remoção
- **Persistência:** as entradas ficam no `localStorage` e continuam lá depois de recarregar a página, fechar o navegador ou ficar sem internet
- **Offline:** o service worker guarda o app em cache; sem conexão ele abre normalmente e continua criando e removendo entradas
- **Instalável:** `manifest.json` completo, ícones de 192 e 512 px (mais um ícone *maskable*) e botão **Instalar app** usando o evento `beforeinstallprompt`
- **Responsivo:** mobile first, com uma coluna no celular, grade de cartões no tablet e formulário fixo ao lado da lista no desktop
- **Extras:** busca que ignora acentos, indicador Online/Offline, tema claro/escuro salvo, cartões com efeito 3D, sincronização entre abas e respeito a `prefers-reduced-motion`

## Estrutura

```
diario-de-bordo/
├── index.html          # estrutura e marcação
├── style.css           # visual, temas e responsividade
├── script.js           # CRUD, localStorage, instalação e registro do SW
├── manifest.json       # metadados para instalação
├── service-worker.js   # cache e funcionamento offline
└── icons/
    ├── icon-192.png
    ├── icon-512.png
    └── icon-maskable-512.png
```

## Como rodar localmente

Service workers só funcionam em `http://localhost` ou HTTPS, então **não abra o `index.html` com dois cliques** (`file://`). Use um servidor local:

```bash
# opção 1: Python
python -m http.server 5500

# opção 2: Node
npx serve .
```

Também dá para usar a extensão **Live Server** do VS Code. Depois, acesse `http://localhost:5500`.

## Testando o PWA

1. **Offline:** abra o DevTools → aba **Application** → **Service workers** e marque **Offline** (ou use o **Network → Offline**). Recarregue a página: o app abre e as entradas continuam lá.
2. **Instalação:** no Chrome ou no Edge, o botão **Instalar app** aparece no topo (ou use o ícone de instalar na barra de endereço). No **Application → Manifest** dá para conferir nome, cores e ícones sem erros.
3. **Lighthouse:** DevTools → **Lighthouse** → gerar relatório. Nas versões mais novas do Chrome, a categoria "PWA" saiu do Lighthouse. Nesse caso, a confirmação de que o app é reconhecido como PWA fica no painel **Application → Manifest** (seção *Installability*) e no botão de instalar do navegador.

> No iPhone/iPad, o Safari não dispara `beforeinstallprompt`. Para instalar, use **Compartilhar → Adicionar à Tela de Início**.

## Atualizando o app

Ao mudar qualquer arquivo, aumente a versão no topo do `service-worker.js`:

```js
const CACHE_VERSAO = 'diario-de-bordo-v2';
```

Assim o cache antigo é apagado e os usuários recebem a versão nova.

## Publicando no GitHub Pages

1. Suba os arquivos para um repositório público.
2. Vá em **Settings → Pages**, em *Source* escolha **Deploy from a branch**, depois a branch `main` e a pasta `/ (root)`.
3. O app fica em `https://SEU-USUARIO.github.io/diario-de-bordo/`. Todos os caminhos são relativos (`./`), então ele funciona dentro da subpasta do Pages.

---

© 2026 Douglas Henrique
