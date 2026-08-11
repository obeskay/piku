<p align="center">
  <img src="public/img/hero.jpg" alt="Piku — Real-time trivia on your local network" width="100%">
</p>

<p align="center">
  <img src="public/img/logo.jpg" alt="Piku logo" width="80">
</p>

<h3 align="center">Piku</h3>
<p align="center">Trivia en tiempo real por Wi-Fi. Sin registro, sin internet, sin base de datos.</p>

<p align="center">
  <a href="#-inicio-rápido"><img src="https://img.shields.io/badge/node-%3E%3D18-brightgreen?style=flat-square" alt="Node >= 18"></a>
  <img src="https://img.shields.io/badge/license-MIT-blue?style=flat-square" alt="MIT License">
  <img src="https://img.shields.io/badge/zero--db-json-orange?style=flat-square" alt="Zero DB">
</p>

---

## ✨ Qué es

Piku es una plataforma de trivia en vivo para redes locales. El anfitrión proyecta las preguntas en una pantalla grande y los jugadores responden desde sus celulares escaneando un QR.

Todo corre en tu red Wi-Fi. Cero cuentas. Cero rastreo. Cero dependencia de internet.

## 🎯 Cómo funciona

1. **Anfitrión** abre `http://localhost:3000` y crea una sala
2. **Jugadores** escanean el QR o ingresan el PIN desde sus celulares
3. Las preguntas se proyectan → los jugadores tocan las formas de color para responder
4. Marcador en vivo → podio final con confetti

## ⚡ Inicio rápido

```bash
git clone https://github.com/tu-usuario/piku.git
cd piku
npm install
npm start
```

Abre `http://localhost:3000`. Para conectar celulares, escanea el QR o ingresa la URL mostrada.

### Puerto personalizado

```bash
PORT=8080 npm start
```

## 📁 Estructura

```
piku/
├── public/
│   ├── css/style.css       # OKLCH dark theme
│   ├── img/                # Logo + hero
│   ├── js/
│   │   ├── audio.js        # Web Audio API synth
│   │   ├── host.js         # Host WebSocket client
│   │   ├── i18n.js         # es/en auto-detection
│   │   └── player.js       # Player WebSocket client
│   ├── host.html           # Pantalla de proyección
│   ├── index.html          # Menú principal
│   └── player.html         # Control del jugador
├── quizzes.json            # Trivias (JSON)
├── server.js               # Express + ws
└── package.json
```

## 🌐 i18n

Piku detecta automáticamente el idioma del navegador (`es` / `en`). También puedes forzar el idioma con `?lang=en` en la URL.

## 🛠️ Stack

| Capa | Tecnología |
|------|-----------|
| Backend | Node.js, Express, ws, qrcode |
| Frontend | HTML5, Vanilla CSS (OKLCH), ES6+ |
| Audio | Web Audio API |
| Tipografía | Instrument Serif + Outfit |

## 🤝 Contribuir

1. Fork el repo
2. `git checkout -b feature/mi-mejora`
3. `git commit -m "feat: mi nueva feature"`
4. `git push origin feature/mi-mejora`
5. Abre un Pull Request

## 📄 Licencia

[MIT](LICENSE)
