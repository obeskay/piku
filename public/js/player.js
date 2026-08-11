// Player Mobile WebSocket Client Engine
const urlParams = new URLSearchParams(window.location.search);
const pin = urlParams.get('pin') || '';
const nickname = urlParams.get('nickname') || 'Jugador';
const avatar = urlParams.get('avatar') || '😎';

let ws = null;

function initPlayer() {
  document.getElementById('player-info-tag').innerText = `${avatar} ${nickname}`;

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}`;
  ws = new WebSocket(wsUrl);

  ws.onopen = () => {
    ws.send(JSON.stringify({
      type: 'join_room',
      data: { pin, nickname, avatar }
    }));
  };

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    const { type, data } = msg;

    if (type === 'joined_success') {
      showPlayerState('lobby');
    }

    else if (type === 'error') {
      window.location.href = '/';
    }

    else if (type === 'question_start') {
      hasAnswered = false;
      showPlayerState('pad');
    }

    else if (type === 'answer_received') {
      showPlayerState('submitted');
    }

    else if (type === 'question_results') {
      const { isCorrect, pointsEarned, totalScore, streak, rank } = data;
      
      document.getElementById('player-score-tag').innerText = totalScore;

      if (streak > 1) {
        document.getElementById('player-streak-badge').style.display = 'inline-flex';
        document.getElementById('streak-val').innerText = streak;
      } else {
        document.getElementById('player-streak-badge').style.display = 'none';
      }

      const resState = document.getElementById('state-result');
      const resIcon = document.getElementById('result-icon');
      const resTitle = document.getElementById('result-title');
      const resPoints = document.getElementById('result-points');
      const resRank = document.getElementById('result-rank-info');

      if (isCorrect) {
        resState.style.background = 'var(--green)';
        resState.style.color = 'white';
        resIcon.innerText = t('playerCorrect');
        resTitle.innerText = '';
        resPoints.innerText = `+${pointsEarned}`;
        resPoints.style.color = 'var(--accent)';
        window.pikuAudio.playCorrect();
      } else {
        resState.style.background = 'var(--red)';
        resState.style.color = 'white';
        resIcon.innerText = t('playerWrong');
        resTitle.innerText = '';
        resPoints.innerText = '+0';
        resPoints.style.color = 'white';
        window.pikuAudio.playIncorrect();
      }

      resRank.innerText = `${t('playerRank')}${rank}`;
      showPlayerState('result');
    }

    else if (type === 'leaderboard_view') {
      showPlayerState('leaderboard-wait');
    }

    else if (type === 'game_over_podium') {
      const { rank, totalScore, isWinner } = data;
      document.getElementById('player-score-tag').innerText = `${totalScore} pts`;

      const pTitle = document.getElementById('podium-title');
      const pRank = document.getElementById('podium-rank');
      const pIcon = document.getElementById('podium-icon');

      if (isWinner) {
        pIcon.innerText = t('playerWinner');
        pTitle.innerText = '';
        pRank.innerText = '#1';
        if (typeof confetti === 'function') confetti();
      } else if (rank <= 3) {
        pIcon.innerText = rank === 2 ? '🥈' : '🥉';
        pTitle.innerText = t('playerPodium');
        pRank.innerText = `#${rank}`;
      } else {
        pIcon.innerText = t('playerGoodTry');
        pTitle.innerText = '';
        pRank.innerText = `#${rank}`;
      }

      showPlayerState('podium');
    }

    else if (type === 'room_closed') {
      window.location.href = '/';
    }
  };

  ws.onerror = () => {};

  ws.onclose = () => {
    const overlay = document.getElementById('connection-lost');
    if (overlay) overlay.style.display = 'flex';
  };
}

let hasAnswered = false;
function submitAnswer(answerIndex) {
  if (hasAnswered) return;
  if (ws && ws.readyState === WebSocket.OPEN) {
    hasAnswered = true;
    window.pikuAudio.playPop();
    ws.send(JSON.stringify({
      type: 'submit_answer',
      data: { answerIndex }
    }));
  }
}

function showPlayerState(stateName) {
  document.getElementById('state-lobby').style.display = stateName === 'lobby' ? 'flex' : 'none';
  document.getElementById('state-pad').style.display = stateName === 'pad' ? 'grid' : 'none';
  document.getElementById('state-submitted').style.display = stateName === 'submitted' ? 'flex' : 'none';
  document.getElementById('state-result').style.display = stateName === 'result' ? 'flex' : 'none';
  document.getElementById('state-leaderboard-wait').style.display = stateName === 'leaderboard-wait' ? 'flex' : 'none';
  document.getElementById('state-podium').style.display = stateName === 'podium' ? 'flex' : 'none';
}

window.onload = initPlayer;
