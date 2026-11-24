/* =========================================================
   Diário de Bordo — lógica da aplicação
   Seções:
     1. Armazenamento (localStorage)
     2. Utilidades de data
     3. Renderização da lista (Read)
     4. Formulário (Create)
     5. Remoção com desfazer (Delete)
     6. Busca
     7. Tema claro/escuro
     8. Status de conexão
     9. Instalação (beforeinstallprompt)
    10. Service worker
   ========================================================= */
'use strict';

/* ---------- 1. Armazenamento ---------- */
const Armazenamento = (() => {
  const CHAVE = 'diario-de-bordo:entradas';

  function carregar() {
    try {
      const bruto = localStorage.getItem(CHAVE);
      const dados = bruto ? JSON.parse(bruto) : [];
      // Garante que só entradas com o formato esperado sejam usadas
      return Array.isArray(dados)
        ? dados.filter((e) => e && typeof e.id === 'string' && typeof e.titulo === 'string')
        : [];
    } catch (erro) {
      console.warn('[Diário] Não foi possível ler os dados salvos:', erro);
      return [];
    }
  }

  function salvar(entradas) {
    try {
      localStorage.setItem(CHAVE, JSON.stringify(entradas));
      return true;
    } catch (erro) {
      console.error('[Diário] Não foi possível salvar:', erro);
      return false;
    }
  }

  return { CHAVE, carregar, salvar };
})();

/* Estado da aplicação: a fonte da verdade é este array */
let entradas = Armazenamento.carregar();
let termoBusca = '';

function gerarId() {
  return (crypto.randomUUID && crypto.randomUUID()) ||
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/* ---------- 2. Utilidades de data ---------- */
function hojeISO() {
  const d = new Date();
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mes}-${dia}`;
}

// "2026-11-24" -> Date local (evita o deslocamento de fuso do new Date("AAAA-MM-DD"))
function isoParaData(iso) {
  const [ano, mes, dia] = iso.split('-').map(Number);
  return new Date(ano, mes - 1, dia);
}

const formatadorData = new Intl.DateTimeFormat('pt-BR', {
  weekday: 'short', day: '2-digit', month: 'short', year: 'numeric',
});

function formatarData(iso) {
  return formatadorData.format(isoParaData(iso)).replace(/\./g, '');
}

function ordenar(lista) {
  // Mais recentes primeiro; empate na data -> a criada por último vem antes
  return [...lista].sort((a, b) =>
    b.data.localeCompare(a.data) || b.criadoEm - a.criadoEm);
}

/* ---------- 3. Renderização (Read) ---------- */
const elLista = document.getElementById('lista-entradas');
const elVazio = document.getElementById('estado-vazio');
const elVazioTitulo = document.getElementById('vazio-titulo');
const elVazioTexto = document.getElementById('vazio-texto');
const elContador = document.getElementById('contador-entradas');
const modeloEntrada = document.getElementById('modelo-entrada');

function filtrar(lista) {
  if (!termoBusca) return lista;
  const termo = normalizar(termoBusca);
  return lista.filter((e) =>
    normalizar(`${e.titulo} ${e.descricao}`).includes(termo));
}

function normalizar(texto) {
  return texto.toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function criarItem(entrada) {
  const item = modeloEntrada.content.firstElementChild.cloneNode(true);
  item.dataset.id = entrada.id;

  // textContent (e não innerHTML) evita injeção de HTML vindo do usuário
  const elData = item.querySelector('.entrada__data');
  elData.dateTime = entrada.data;
  elData.textContent = formatarData(entrada.data);
  item.querySelector('.entrada__titulo').textContent = entrada.titulo;
  item.querySelector('.entrada__descricao').textContent = entrada.descricao;

  const botao = item.querySelector('.entrada__remover');
  botao.dataset.id = entrada.id;
  botao.setAttribute('aria-label', `Remover "${entrada.titulo}"`);

  return item;
}

function renderizar() {
  const visiveis = filtrar(ordenar(entradas));

  const fragmento = document.createDocumentFragment();
  visiveis.forEach((e) => fragmento.appendChild(criarItem(e)));
  elLista.replaceChildren(fragmento);

  elContador.textContent = entradas.length;

  const semNada = visiveis.length === 0;
  elVazio.hidden = !semNada;
  if (semNada && entradas.length > 0) {
    elVazioTitulo.textContent = 'Nada encontrado';
    elVazioTexto.textContent = `Nenhuma entrada corresponde a "${termoBusca}".`;
  } else {
    elVazioTitulo.textContent = 'Nenhuma entrada ainda';
    elVazioTexto.textContent = 'Registre sua primeira atividade no formulário.';
  }
}

/* Inclinação 3D dos cartões acompanhando o ponteiro (só mouse) */
const podeAnimar = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

elLista.addEventListener('pointermove', (evento) => {
  if (!podeAnimar || evento.pointerType !== 'mouse') return;
  const cartao = evento.target.closest('.entrada__cartao');
  if (!cartao) return;
  const r = cartao.getBoundingClientRect();
  const x = (evento.clientX - r.left) / r.width - 0.5;
  const y = (evento.clientY - r.top) / r.height - 0.5;
  cartao.style.setProperty('--ry', `${(x * 6).toFixed(2)}deg`);
  cartao.style.setProperty('--rx', `${(-y * 6).toFixed(2)}deg`);
});

elLista.addEventListener('pointerout', (evento) => {
  const cartao = evento.target.closest('.entrada__cartao');
  if (cartao && !cartao.contains(evento.relatedTarget)) {
    cartao.style.setProperty('--rx', '0deg');
    cartao.style.setProperty('--ry', '0deg');
  }
});

/* ---------- 4. Formulário (Create) ---------- */
const formulario = document.getElementById('formulario-entrada');
const campoTitulo = document.getElementById('campo-titulo');
const campoDescricao = document.getElementById('campo-descricao');
const campoData = document.getElementById('campo-data');
const contadorDescricao = document.getElementById('contador-descricao');

campoData.value = hojeISO();

function atualizarContadorDescricao() {
  contadorDescricao.textContent = `${campoDescricao.value.length}/${campoDescricao.maxLength}`;
}
campoDescricao.addEventListener('input', atualizarContadorDescricao);

function mostrarErro(campo, mensagem) {
  const elErro = document.getElementById(`erro-${campo.name}`);
  elErro.textContent = mensagem;
  if (mensagem) {
    campo.setAttribute('aria-invalid', 'true');
    campo.setAttribute('aria-describedby', elErro.id);
  } else {
    campo.removeAttribute('aria-invalid');
    campo.removeAttribute('aria-describedby');
  }
}

function validar({ titulo, descricao, data }) {
  const erros = {};
  if (!titulo) erros.titulo = 'Dê um título para a entrada.';
  if (!descricao) erros.descricao = 'Descreva o que aconteceu.';
  if (!data || !/^\d{4}-\d{2}-\d{2}$/.test(data)) erros.data = 'Escolha uma data válida.';
  return erros;
}

// Limpa o erro assim que o usuário corrige o campo
[campoTitulo, campoDescricao, campoData].forEach((campo) => {
  campo.addEventListener('input', () => {
    if (campo.getAttribute('aria-invalid')) mostrarErro(campo, '');
  });
});

formulario.addEventListener('submit', (evento) => {
  evento.preventDefault();

  const dados = {
    titulo: campoTitulo.value.trim(),
    descricao: campoDescricao.value.trim(),
    data: campoData.value,
  };

  const erros = validar(dados);
  mostrarErro(campoTitulo, erros.titulo || '');
  mostrarErro(campoDescricao, erros.descricao || '');
  mostrarErro(campoData, erros.data || '');

  const primeiroInvalido = formulario.querySelector('[aria-invalid="true"]');
  if (primeiroInvalido) {
    primeiroInvalido.focus();
    return;
  }

  const nova = { id: gerarId(), ...dados, criadoEm: Date.now() };
  entradas.push(nova);

  if (!Armazenamento.salvar(entradas)) {
    entradas.pop();
    mostrarToast('Não foi possível salvar. O armazenamento do navegador pode estar cheio.');
    return;
  }

  formulario.reset();
  campoData.value = hojeISO();
  atualizarContadorDescricao();
  renderizar();
  mostrarToast('Entrada registrada.');
  campoTitulo.focus();
});

/* ---------- 5. Remoção com desfazer (Delete) ---------- */
const elToast = document.getElementById('toast');
const elToastTexto = document.getElementById('toast-texto');
const elToastAcao = document.getElementById('toast-acao');
let temporizadorToast = null;
let acaoToast = null;

function mostrarToast(texto, { rotuloAcao, aoAgir, duracao = 3500 } = {}) {
  clearTimeout(temporizadorToast);
  elToastTexto.textContent = texto;
  acaoToast = aoAgir || null;
  elToastAcao.hidden = !aoAgir;
  if (rotuloAcao) elToastAcao.textContent = rotuloAcao;

  // Reinicia a animação de entrada
  elToast.hidden = true;
  void elToast.offsetWidth;
  elToast.hidden = false;

  temporizadorToast = setTimeout(esconderToast, duracao);
}

function esconderToast() {
  elToast.hidden = true;
  acaoToast = null;
}

elToastAcao.addEventListener('click', () => {
  if (acaoToast) acaoToast();
  esconderToast();
});

function removerEntrada(id) {
  const indice = entradas.findIndex((e) => e.id === id);
  if (indice === -1) return;

  const [removida] = entradas.splice(indice, 1);
  Armazenamento.salvar(entradas);

  const finalizar = () => {
    renderizar();
    mostrarToast(`"${removida.titulo}" removida.`, {
      rotuloAcao: 'Desfazer',
      duracao: 6000,
      aoAgir: () => {
        entradas.push(removida);
        Armazenamento.salvar(entradas);
        renderizar();
      },
    });
  };

  const item = elLista.querySelector(`[data-id="${CSS.escape(id)}"]`);
  if (item && podeAnimar) {
    item.classList.add('is-saindo');
    item.addEventListener('animationend', finalizar, { once: true });
  } else {
    finalizar();
  }
}

elLista.addEventListener('click', (evento) => {
  const botao = evento.target.closest('.entrada__remover');
  if (botao) removerEntrada(botao.dataset.id);
});

/* ---------- 6. Busca ---------- */
document.getElementById('campo-busca').addEventListener('input', (evento) => {
  termoBusca = evento.target.value.trim();
  renderizar();
});

/* Mantém várias abas sincronizadas */
window.addEventListener('storage', (evento) => {
  if (evento.key === Armazenamento.CHAVE) {
    entradas = Armazenamento.carregar();
    renderizar();
  }
});

/* ---------- 7. Tema ---------- */
const CHAVE_TEMA = 'diario-de-bordo:tema';
const raiz = document.documentElement;

function temaAtual() {
  if (raiz.dataset.tema) return raiz.dataset.tema;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'escuro' : 'claro';
}

function aplicarTema(tema) {
  raiz.dataset.tema = tema;
  try { localStorage.setItem(CHAVE_TEMA, tema); } catch (e) { /* modo privado */ }
  const cor = getComputedStyle(raiz).getPropertyValue('--fundo').trim();
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute('content', cor));
}

document.getElementById('botao-tema').addEventListener('click', () => {
  aplicarTema(temaAtual() === 'escuro' ? 'claro' : 'escuro');
});

/* ---------- 8. Status de conexão ---------- */
const elStatus = document.getElementById('status-rede');

function atualizarStatusRede() {
  const online = navigator.onLine;
  elStatus.classList.toggle('is-offline', !online);
  elStatus.querySelector('.status-rede__texto').textContent = online ? 'Online' : 'Offline';
}

window.addEventListener('online', () => {
  atualizarStatusRede();
  mostrarToast('Conexão restabelecida.');
});
window.addEventListener('offline', () => {
  atualizarStatusRede();
  mostrarToast('Você está offline — suas entradas continuam salvas.');
});

/* ---------- 9. Instalação (beforeinstallprompt) ---------- */
const botaoInstalar = document.getElementById('botao-instalar');
let eventoInstalacao = null;

window.addEventListener('beforeinstallprompt', (evento) => {
  // Impede o mini-banner automático e guarda o evento para usar no nosso botão
  evento.preventDefault();
  eventoInstalacao = evento;
  botaoInstalar.hidden = false;
});

botaoInstalar.addEventListener('click', async () => {
  if (!eventoInstalacao) return;
  botaoInstalar.hidden = true;
  eventoInstalacao.prompt();
  const { outcome } = await eventoInstalacao.userChoice;
  if (outcome === 'dismissed') botaoInstalar.hidden = false;
  eventoInstalacao = null; // o evento só pode ser usado uma vez
});

window.addEventListener('appinstalled', () => {
  eventoInstalacao = null;
  botaoInstalar.hidden = true;
  mostrarToast('Diário de Bordo instalado!');
});

/* ---------- 10. Service worker ---------- */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('./service-worker.js')
      .then((registro) => console.info('[Diário] Service worker registrado no escopo:', registro.scope))
      .catch((erro) => console.error('[Diário] Falha ao registrar o service worker:', erro));
  });
}

/* ---------- Inicialização ---------- */
atualizarStatusRede();
atualizarContadorDescricao();
renderizar();
