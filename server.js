const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const os = require('os');
const fs = require('fs');
const path = require('path');
const QRCode = require('qrcode');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Helper to get Local IP address for LAN connection
function getLocalIp() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const net of interfaces[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return 'localhost';
}

const PORT = process.env.PORT || 3000;
const LOCAL_IP = getLocalIp();
const BASE_URL = `http://${LOCAL_IP}:${PORT}`;

// Load Quizzes
const QUIZZES_FILE = path.join(__dirname, 'quizzes.json');
let quizzes = [];

function loadQuizzes() {
  try {
    if (fs.existsSync(QUIZZES_FILE)) {
      quizzes = JSON.parse(fs.readFileSync(QUIZZES_FILE, 'utf8'));
    }
  } catch (err) {
    console.error('Error loading quizzes:', err);
    quizzes = [];
  }
}
loadQuizzes();

// API Endpoints
app.get('/api/quizzes', (req, res) => {
  res.json(quizzes);
});

app.post('/api/quizzes', (req, res) => {
  const newQuiz = req.body;
  if (!newQuiz || !newQuiz.title || !Array.isArray(newQuiz.questions)) {
    return res.status(400).json({ error: 'Quiz inválido' });
  }
  newQuiz.id = 'quiz-' + Date.now();
  quizzes.push(newQuiz);
  try {
    fs.writeFileSync(QUIZZES_FILE, JSON.stringify(quizzes, null, 2));
  } catch (err) {
    console.error('Failed to save quiz:', err);
  }
  res.json({ success: true, quiz: newQuiz });
});

app.get('/api/info', async (req, res) => {
  try {
    const qrDataUrl = await QRCode.toDataURL(BASE_URL);
    res.json({
      localIp: LOCAL_IP,
      port: PORT,
      url: BASE_URL,
      qrCode: qrDataUrl
    });
  } catch (err) {
    res.json({ localIp: LOCAL_IP, port: PORT, url: BASE_URL, qrCode: null });
  }
});

// In-Memory Game Rooms Store
// roomPin -> { pin, hostWs, quiz, state, currentQuestionIndex, players: Map(socketId -> playerObj), timer: null, questionStartTime: 0 }
const rooms = new Map();

function generatePin() {
  let pin;
  do {
    pin = Math.floor(100000 + Math.random() * 900000).toString();
  } while (rooms.has(pin));
  return pin;
}

// WebSocket Connection Router
wss.on('connection', (ws) => {
  ws.id = Math.random().toString(36).substring(2, 9);

  ws.on('message', (messageStr) => {
    let msg;
    try {
      msg = JSON.parse(messageStr);
    } catch (e) {
      return;
    }

    const { type, data } = msg;

    // --- HOST HANDLERS ---
    if (type === 'create_room') {
      const { quizId } = data;
      const quiz = quizzes.find((q) => q.id === quizId);
      if (!quiz) {
        return ws.send(JSON.stringify({ type: 'error', data: { message: 'Quiz no encontrado. Selecciona uno válido.' } }));
      }

      const pin = generatePin();
      const room = {
        pin,
        hostWs: ws,
        quiz,
        state: 'LOBBY', // LOBBY, QUESTION, RESULTS, LEADERBOARD, PODIUM
        currentQuestionIndex: -1,
        players: new Map(), // socketId -> { id, nickname, avatar, score, streak, currentAnswer: null, answerTimeMs: 0 }
        timer: null,
        questionStartTime: 0
      };

      rooms.set(pin, room);
      ws.roomPin = pin;
      ws.isHost = true;

      ws.send(JSON.stringify({
        type: 'room_created',
        data: { pin, quizTitle: quiz.title, totalQuestions: quiz.questions.length }
      }));
    }

    else if (type === 'start_game') {
      const room = rooms.get(ws.roomPin);
      if (!room || !ws.isHost || room.state !== 'LOBBY') return;
      
      startNextQuestion(room);
    }

    else if (type === 'next_question') {
      const room = rooms.get(ws.roomPin);
      if (!room || !ws.isHost) return;

      if (room.currentQuestionIndex + 1 < room.quiz.questions.length) {
        startNextQuestion(room);
      } else {
        showPodium(room);
      }
    }

    else if (type === 'skip_timer') {
      const room = rooms.get(ws.roomPin);
      if (!room || !ws.isHost || room.state !== 'QUESTION') return;
      endCurrentQuestion(room);
    }

    else if (type === 'show_leaderboard') {
      const room = rooms.get(ws.roomPin);
      if (!room || !ws.isHost || room.state !== 'RESULTS') return;

      room.state = 'LEADERBOARD';
      const leaderboard = getSortedLeaderboard(room);

      const payload = JSON.stringify({
        type: 'leaderboard',
        data: {
          leaderboard: leaderboard.slice(0, 5),
          questionIndex: room.currentQuestionIndex + 1,
          totalQuestions: room.quiz.questions.length
        }
      });

      ws.send(payload);
      broadcastToPlayers(room, { type: 'leaderboard_view', data: {} });
    }

    // --- PLAYER HANDLERS ---
    else if (type === 'join_room') {
      const { pin, nickname, avatar } = data;
      const room = rooms.get(pin);

      if (!room) {
        return ws.send(JSON.stringify({ type: 'error', data: { message: 'PIN de juego inválido' } }));
      }
      if (room.state !== 'LOBBY') {
        return ws.send(JSON.stringify({ type: 'error', data: { message: 'El juego ya comenzó' } }));
      }

      // Check duplicate nickname
      for (const p of room.players.values()) {
        if (p.nickname.toLowerCase() === nickname.trim().toLowerCase()) {
          return ws.send(JSON.stringify({ type: 'error', data: { message: 'Ese apodo ya está en uso' } }));
        }
      }

      const playerObj = {
        id: ws.id,
        nickname: nickname.trim(),
        avatar: avatar || '😎',
        score: 0,
        streak: 0,
        currentAnswer: null,
        answerTimeMs: 0,
        lastPointsEarned: 0
      };

      room.players.set(ws.id, playerObj);
      ws.roomPin = pin;
      ws.isHost = false;
      ws.playerObj = playerObj;

      ws.send(JSON.stringify({
        type: 'joined_success',
        data: { pin, nickname: playerObj.nickname, avatar: playerObj.avatar }
      }));

      // Notify host
      if (room.hostWs && room.hostWs.readyState === WebSocket.OPEN) {
        room.hostWs.send(JSON.stringify({
          type: 'player_joined',
          data: {
            player: { id: playerObj.id, nickname: playerObj.nickname, avatar: playerObj.avatar },
            totalPlayers: room.players.size
          }
        }));
      }
    }

    else if (type === 'submit_answer') {
      const room = rooms.get(ws.roomPin);
      if (!room || room.state !== 'QUESTION') return;

      const player = room.players.get(ws.id);
      if (!player || player.currentAnswer !== null) return; // already answered

      const { answerIndex } = data;
      const now = Date.now();
      const timeSpentMs = now - room.questionStartTime;

      player.currentAnswer = answerIndex;
      player.answerTimeMs = timeSpentMs;

      ws.send(JSON.stringify({ type: 'answer_received', data: { answerIndex } }));

      // Notify host count
      const answeredCount = Array.from(room.players.values()).filter(p => p.currentAnswer !== null).length;
      if (room.hostWs && room.hostWs.readyState === WebSocket.OPEN) {
        room.hostWs.send(JSON.stringify({
          type: 'answer_submitted_count',
          data: { answeredCount, totalPlayers: room.players.size }
        }));
      }

      // If all players answered, immediately end question
      if (answeredCount >= room.players.size && room.players.size > 0) {
        if (room.timer) clearTimeout(room.timer);
        endCurrentQuestion(room);
      }
    }
  });

  ws.on('close', () => {
    if (ws.roomPin) {
      const room = rooms.get(ws.roomPin);
      if (room) {
        if (ws.isHost) {
          // Host left: close room
          broadcastToPlayers(room, { type: 'room_closed', data: { message: 'El anfitrión ha cerrado la sala' } });
          rooms.delete(ws.roomPin);
        } else {
          // Player left
          room.players.delete(ws.id);
          if (room.hostWs && room.hostWs.readyState === WebSocket.OPEN) {
            room.hostWs.send(JSON.stringify({
              type: 'player_left',
              data: { id: ws.id, totalPlayers: room.players.size }
            }));
          }
        }
      }
    }
  });
});

// Game Flow Logic
function startNextQuestion(room) {
  if (room.timer) clearTimeout(room.timer);
  room.currentQuestionIndex++;
  room.state = 'QUESTION';

  // Reset player answers for new question
  for (const p of room.players.values()) {
    p.currentAnswer = null;
    p.answerTimeMs = 0;
    p.lastPointsEarned = 0;
  }

  const q = room.quiz.questions[room.currentQuestionIndex];
  room.questionStartTime = Date.now();

  // Send to host full question with options and time limit
  room.hostWs.send(JSON.stringify({
    type: 'question_start',
    data: {
      questionIndex: room.currentQuestionIndex + 1,
      totalQuestions: room.quiz.questions.length,
      question: q.question,
      options: q.options,
      timeLimit: q.timeLimit
    }
  }));

  // Send to players clean prompt (shapes/colors only)
  broadcastToPlayers(room, {
    type: 'question_start',
    data: {
      questionIndex: room.currentQuestionIndex + 1,
      totalQuestions: room.quiz.questions.length,
      optionsCount: q.options.length,
      timeLimit: q.timeLimit
    }
  });

  // Countdown timer
  room.timer = setTimeout(() => {
    endCurrentQuestion(room);
  }, q.timeLimit * 1000);
}

function endCurrentQuestion(room) {
  if (room.timer) clearTimeout(room.timer);
  room.state = 'RESULTS';

  const q = room.quiz.questions[room.currentQuestionIndex];
  const correctIdx = q.correctIndex;
  const timeLimitMs = q.timeLimit * 1000;

  // Calculate score distribution & update player points
  const optionsCount = q.options.length;
  const distribution = new Array(optionsCount).fill(0);

  for (const player of room.players.values()) {
    if (player.currentAnswer !== null && player.currentAnswer >= 0 && player.currentAnswer < optionsCount) {
      distribution[player.currentAnswer]++;
    }

    if (player.currentAnswer === correctIdx) {
      // Score formula: 1000 * (1 - (timeSpent / totalTime) / 2)
      const ratio = Math.min(1, Math.max(0, player.answerTimeMs / timeLimitMs));
      const points = Math.round(1000 * (1 - ratio / 2));
      player.streak++;
      player.score += points;
      player.lastPointsEarned = points;
    } else {
      player.streak = 0;
      player.lastPointsEarned = 0;
    }
  }

  const leaderboard = getSortedLeaderboard(room);

  // Send host full breakdown & correct answer
  room.hostWs.send(JSON.stringify({
    type: 'question_results',
    data: {
      correctIndex: correctIdx,
      distribution,
      leaderboard: leaderboard.slice(0, 5),
      questionIndex: room.currentQuestionIndex + 1,
      totalQuestions: room.quiz.questions.length
    }
  }));

  // Send individual result to each player
  wss.clients.forEach((client) => {
    if (client.roomPin === room.pin && !client.isHost && client.playerObj) {
      const p = room.players.get(client.id);
      const isCorrect = p ? p.currentAnswer === correctIdx : false;
      const rank = leaderboard.findIndex(item => item.id === client.id) + 1;

      client.send(JSON.stringify({
        type: 'question_results',
        data: {
          isCorrect,
          correctIndex: correctIdx,
          pointsEarned: p ? p.lastPointsEarned : 0,
          totalScore: p ? p.score : 0,
          streak: p ? p.streak : 0,
          rank
        }
      }));
    }
  });
}

function showPodium(room) {
  room.state = 'PODIUM';
  const leaderboard = getSortedLeaderboard(room);

  const top3 = leaderboard.slice(0, 3);
  const payloadHost = JSON.stringify({
    type: 'game_over_podium',
    data: { podium: top3, totalPlayers: room.players.size }
  });

  if (room.hostWs && room.hostWs.readyState === WebSocket.OPEN) {
    room.hostWs.send(payloadHost);
  }

  wss.clients.forEach((client) => {
    if (client.roomPin === room.pin && !client.isHost && client.playerObj) {
      const rank = leaderboard.findIndex(item => item.id === client.id) + 1;
      const p = room.players.get(client.id);
      client.send(JSON.stringify({
        type: 'game_over_podium',
        data: {
          rank,
          totalScore: p ? p.score : 0,
          isWinner: rank === 1
        }
      }));
    }
  });
}

function getSortedLeaderboard(room) {
  return Array.from(room.players.values())
    .sort((a, b) => b.score - a.score || a.answerTimeMs - b.answerTimeMs);
}

function broadcastToPlayers(room, messageObj) {
  const str = JSON.stringify(messageObj);
  wss.clients.forEach((client) => {
    if (client.roomPin === room.pin && !client.isHost && client.readyState === WebSocket.OPEN) {
      client.send(str);
    }
  });
}

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n  🎮 Piku corriendo en ${BASE_URL}\n`);
});

// Graceful shutdown
function shutdown() {
  console.log('\n  Cerrando servidor...');
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({ type: 'room_closed', data: { message: 'El servidor se ha detenido' } }));
      client.close();
    }
  });
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 3000);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
