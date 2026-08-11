// Lightweight i18n engine — auto-detects browser language, falls back to 'es'
const T = {
  es: {
    // index.html
    joinTab: '📱 Jugar',
    hostTab: '🖥️ Crear',
    pinLabel: 'PIN',
    pinPlaceholder: '482910',
    nameLabel: 'Tu nombre',
    namePlaceholder: 'Ej: Luna',
    avatarLabel: 'Avatar',
    joinBtn: '¡Entrar!',
    joinErrPin: 'PIN inválido',
    joinErrName: 'Escribe tu nombre',
    hostTitle: 'Elige trivia',
    hostStart: '🚀 Crear sala',
    hostCreate: '➕ Nueva trivia',
    creatorTitle: 'Crear trivia',
    creatorName: 'Nombre',
    creatorNamePh: 'Ej: Noche de trivia',
    creatorAdd: '➕ Pregunta',
    creatorSave: '💾 Guardar',
    creatorCancel: 'Cancelar',
    creatorQuestionPh: 'Escribe la pregunta',
    creatorCorrect: 'Correcta',
    creatorTime: 'Tiempo',
    creatorAlertTitle: 'Escribe el nombre',
    creatorAlertMin: 'Agrega al menos 1 pregunta completa',
    creatorAlertOk: '¡Guardada!',
    // host.html
    hostScan: 'Escanea para unirte',
    hostPin: 'PIN',
    hostPlayers: 'Jugadores',
    hostGo: '¡Empezar! 🚀',
    hostQ: 'Pregunta',
    hostOf: 'de',
    hostAnswers: 'Respuestas',
    hostChart: 'Resultados',
    hostRanking: '🏆 Ranking',
    hostNext: 'Siguiente ➡️',
    hostFinalPodium: 'Ver podio 🏆',
    hostGameOver: '🎉',
    hostHome: '🏠',
    hostDisconnected: 'Desconectado',
    hostReconnect: '🔄',
    // player.html
    playerIn: '¡Listo!',
    playerWait: 'Esperando…',
    playerSent: '✓ Enviada',
    playerSentSub: 'Esperando…',
    playerCorrect: '✅',
    playerWrong: '❌',
    playerRank: '#',
    playerLb: '📊',
    playerLbSub: 'Mira la pantalla',
    playerWinner: '🥇',
    playerPodium: '¡Podio!',
    playerGoodTry: '👏',
    playerHome: '🏠',
    playerDisconnected: 'Desconectado',
    playerReconnect: '🏠',
  },
  en: {
    joinTab: '📱 Play',
    hostTab: '🖥️ Host',
    pinLabel: 'PIN',
    pinPlaceholder: '482910',
    nameLabel: 'Your name',
    namePlaceholder: 'e.g. Luna',
    avatarLabel: 'Avatar',
    joinBtn: 'Join!',
    joinErrPin: 'Invalid PIN',
    joinErrName: 'Enter your name',
    hostTitle: 'Pick a trivia',
    hostStart: '🚀 Create room',
    hostCreate: '➕ New trivia',
    creatorTitle: 'Create trivia',
    creatorName: 'Name',
    creatorNamePh: 'e.g. Game night',
    creatorAdd: '➕ Question',
    creatorSave: '💾 Save',
    creatorCancel: 'Cancel',
    creatorQuestionPh: 'Write the question',
    creatorCorrect: 'Correct',
    creatorTime: 'Time',
    creatorAlertTitle: 'Enter a name',
    creatorAlertMin: 'Add at least 1 complete question',
    creatorAlertOk: 'Saved!',
    hostScan: 'Scan to join',
    hostPin: 'PIN',
    hostPlayers: 'Players',
    hostGo: 'Start! 🚀',
    hostQ: 'Q',
    hostOf: 'of',
    hostAnswers: 'Answers',
    hostChart: 'Results',
    hostRanking: '🏆 Ranking',
    hostNext: 'Next ➡️',
    hostFinalPodium: 'Final podium 🏆',
    hostGameOver: '🎉',
    hostHome: '🏠',
    hostDisconnected: 'Disconnected',
    hostReconnect: '🔄',
    playerIn: 'Ready!',
    playerWait: 'Waiting…',
    playerSent: '✓ Sent',
    playerSentSub: 'Waiting…',
    playerCorrect: '✅',
    playerWrong: '❌',
    playerRank: '#',
    playerLb: '📊',
    playerLbSub: 'Look at the screen',
    playerWinner: '🥇',
    playerPodium: 'Podium!',
    playerGoodTry: '👏',
    playerHome: '🏠',
    playerDisconnected: 'Disconnected',
    playerReconnect: '🏠',
  }
};

// Detect language: ?lang= param > navigator > 'es'
const _params = new URLSearchParams(window.location.search);
const LANG = _params.get('lang') || (navigator.language || '').slice(0, 2);
const i18n = T[LANG] || T['es'];

// Helper to translate a key
function t(key) { return i18n[key] || T['es'][key] || key; }

// Auto-apply data-i18n attributes on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    const val = t(key);
    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
      el.placeholder = val;
    } else {
      el.textContent = val;
    }
  });
  document.querySelectorAll('[data-i18n-ph]').forEach(el => {
    el.placeholder = t(el.getAttribute('data-i18n-ph'));
  });
});
