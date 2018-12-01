const WebSocket = require('ws');
const SocketServer = require('ws').Server;
const webpush = require('web-push');
const express = require('express');

const app = express();
app.use(express.static('.'));
const httpServer = app.listen(8080);
const socketServer = new SocketServer({server: httpServer});

const socketPlayerMap = new Map();

const vapidKeys = webpush.generateVAPIDKeys();

webpush.setVapidDetails(
  'mailto:example@example.com',
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

const pushSubscriptions = [];

socketServer.on('connection', (socket) => {
  const sendUpdatePlayers = () => {
    const players = [...socketPlayerMap.values()];
    socketServer.clients.forEach(socket => socket.send(JSON.stringify({type: 'players', players})));
    if (players.length >= 10) {
      pushSubscriptions.forEach(pushSubscription => {
        webpush.sendNotification(pushSubscription, `${players.length} people want to play CTF now!`);
      });
    }
  };
  const sendVapidPublicKey = () => {
    socket.send(JSON.stringify({type: 'vapid', key: vapidKeys.publicKey}));
  };

  sendUpdatePlayers();
  sendVapidPublicKey();

  socket.on('message', message => {
    const packet = JSON.parse(message);
    if (packet.type === 'join') {
      socketPlayerMap.set(socket, packet.name);
      sendUpdatePlayers();
    } else if (packet.type === 'leave') {
      socketPlayerMap.delete(socket);
      sendUpdatePlayers();
    } else if (packet.type === 'push-subscription') {
      pushSubscriptions.push(packet.pushSubscription);
    }
  });

  socket.on('close', () => {
    socketPlayerMap.delete(socket);
    sendUpdatePlayers();
  });
});