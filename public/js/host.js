// Host WebSocket Client Engine
const urlParams = new URLSearchParams(window.location.search);
const quizId = urlParams.get('quizId') || '';

let ws = null;
let roomPin = null;
let currentQuestionIndex = 0;
let totalQuestions = 0;
let timerInterval = null;
let timeRemaining = 0;

function initHost() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}`;
  ws = new WebSocket(wsUrl);

  ws.onopen = () => {
    ws.send(JSON.stringify({
      type: 'create_room',
      data: { quizId }
    }));
  };

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    const { type, data } = msg;

    if (type === 'room_created') {
      roomPin = data.pin;
      totalQuestions = data.totalQuestions;
      document.getElementById('pin-display').innerText = roomPin;
      
      // Start Lobby BGM
      window.pikuAudio.playLobbyBgm();
      
      // Fetch LAN IP info for join URL & QR code
      fetch('/api/info')
        .then(res => res.json())
        .then(info => {
          document.getElementById('lan-join-url').innerText = info.url;
          if (info.qrCode) {
            document.getElementById('qr-img').src = info.qrCode;
          }
        });
    }

    else if (type === 'player_joined') {
      const { player, totalPlayers } = data;
      document.getElementById('player-count').innerText = totalPlayers;
      window.pikuAudio.playPop();

      const grid = document.getElementById('players-grid');
      const chip = document.createElement('div');
      chip.className = 'player-chip';
      chip.id = `player-${player.id}`;
      chip.innerHTML = `<span>${player.avatar}</span> <span>${player.nickname}</span>`;
      grid.appendChild(chip);

      document.getElementById('start-btn').disabled = totalPlayers === 0;
    }

    else if (type === 'player_left') {
      const { id, totalPlayers } = data;
      document.getElementById('player-count').innerText = totalPlayers;
      const chip = document.getElementById(`player-${id}`);
      if (chip) chip.remove();
      document.getElementById('start-btn').disabled = totalPlayers === 0;
    }

    else if (type === 'question_start') {
      showScreen('question');
      document.getElementById('chart-section').style.display = 'none';
      document.getElementById('answers-grid').style.display = 'grid';
      window.pikuAudio.playQuestionBgm();

      const { questionIndex, totalQuestions: tot, question, options, timeLimit } = data;
      document.getElementById('q-num').innerText = questionIndex;
      document.getElementById('q-total').innerText = tot;
      document.getElementById('question-title').innerText = question;
      document.getElementById('ans-count').innerText = 0;
      document.getElementById('ans-total-players').innerText = document.getElementById('player-count').innerText;

      // Populate options
      options.forEach((optText, idx) => {
        document.getElementById(`opt-${idx}-text`).innerText = optText;
        const card = document.querySelector(`.answer-card.opt-${idx}`);
        card.classList.remove('dimmed', 'correct-highlight');
      });

      // Start countdown animation & Audio
      startHostTimer(timeLimit);
    }

    else if (type === 'answer_submitted_count') {
      document.getElementById('ans-count').innerText = data.answeredCount;
      document.getElementById('ans-total-players').innerText = data.totalPlayers;
      window.pikuAudio.playPop();
    }

    else if (type === 'question_results') {
      clearInterval(timerInterval);
      window.pikuAudio.stopBgm();
      window.pikuAudio.playCorrect();

      const { correctIndex, distribution, leaderboard } = data;

      // Highlight correct answer and dim others
      [0, 1, 2, 3].forEach((idx) => {
        const card = document.querySelector(`.answer-card.opt-${idx}`);
        if (idx === correctIndex) {
          card.classList.add('correct-highlight');
        } else {
          card.classList.add('dimmed');
        }
      });

      // Render Bar Chart
      const maxVotes = Math.max(1, ...distribution);
      distribution.forEach((count, idx) => {
        document.getElementById(`chart-count-${idx}`).innerText = count;
        const pct = Math.round((count / maxVotes) * 100);
        document.getElementById(`chart-bar-${idx}`).style.height = `${pct}%`;
      });

      document.getElementById('chart-section').style.display = 'flex';
    }

    else if (type === 'leaderboard') {
      showScreen('leaderboard');
      const list = document.getElementById('leaderboard-list');
      list.innerHTML = '';

      const { leaderboard, questionIndex, totalQuestions: tot } = data;

      if (questionIndex >= tot) {
        document.getElementById('next-btn').innerText = t('hostFinalPodium');
      }

      leaderboard.forEach((player, idx) => {
        const item = document.createElement('div');
        item.className = 'leaderboard-item';
        item.style.animationDelay = `${idx * 0.1}s`;
        item.innerHTML = `
          <div style="display: flex; align-items: center; gap: 14px;">
            <div class="rank-badge">${idx + 1}</div>
            <span>${player.avatar} ${player.nickname}</span>
            ${player.streak > 1 ? `<span class="streak-badge">🔥 ${player.streak}</span>` : ''}
          </div>
          <div style="color: var(--accent);">${player.score}</div>
        `;
        list.appendChild(item);
      });
    }

    else if (type === 'game_over_podium') {
      showScreen('podium');
      window.pikuAudio.stopBgm();
      window.pikuAudio.playPodiumFanfare();
      if (typeof confetti === 'function') {
        confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
      }

      const podiumDisplay = document.getElementById('podium-display');
      podiumDisplay.innerHTML = '';

      const podiumData = data.podium; // array of up to 3 players
      // Order for visual display: 2nd place (left), 1st place (center), 3rd place (right)
      const order = [podiumData[1], podiumData[0], podiumData[2]];
      const ranks = [2, 1, 3];

      order.forEach((p, idx) => {
        if (!p) return;
        const rank = ranks[idx];
        const step = document.createElement('div');
        step.className = `podium-step podium-${rank}`;
        step.innerHTML = `
          <div class="podium-player">
            <div style="font-size: 2rem;">${p.avatar}</div>
            <div>${p.nickname}</div>
            <div style="font-size: 0.9rem; font-weight: 700; opacity: 0.8;">${p.score} pts</div>
          </div>
          <div class="podium-block">${rank}</div>
        `;
        podiumDisplay.appendChild(step);
      });
    }
  };

  ws.onerror = () => {};

  ws.onclose = () => {
    const overlay = document.getElementById('connection-lost');
    if (overlay) overlay.style.display = 'flex';
  };
}

function startGame() {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'start_game' }));
  }
}

function nextQuestion() {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'next_question' }));
  }
}

function showLeaderboard() {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'show_leaderboard' }));
  }
}

function startHostTimer(durationSec) {
  if (timerInterval) clearInterval(timerInterval);
  timeRemaining = durationSec;
  const timerBar = document.getElementById('timer-bar');
  const timerText = document.getElementById('timer-text');

  timerText.innerText = timeRemaining;
  timerBar.style.width = '100%';
  timerBar.style.backgroundColor = '#ffcc00';

  const startTime = Date.now();
  const totalMs = durationSec * 1000;

  timerInterval = setInterval(() => {
    const elapsedMs = Date.now() - startTime;
    const remainingMs = Math.max(0, totalMs - elapsedMs);
    const pct = (remainingMs / totalMs) * 100;

    timerBar.style.width = `${pct}%`;
    const secs = Math.ceil(remainingMs / 1000);
    timerText.innerText = secs;

    if (secs <= 5) {
      timerBar.style.backgroundColor = '#e21b3c';
      window.pikuAudio.playTick();
    }

    if (remainingMs <= 0) {
      clearInterval(timerInterval);
    }
  }, 100);
}

function showScreen(screenName) {
  document.getElementById('screen-lobby').style.display = screenName === 'lobby' ? 'flex' : 'none';
  document.getElementById('screen-question').style.display = screenName === 'question' ? 'flex' : 'none';
  document.getElementById('screen-leaderboard').style.display = screenName === 'leaderboard' ? 'flex' : 'none';
  document.getElementById('screen-podium').style.display = screenName === 'podium' ? 'flex' : 'none';
}

window.onload = initHost;
