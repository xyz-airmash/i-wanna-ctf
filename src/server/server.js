const socketIO = require('socket.io');
const webpush = require('web-push');
const express = require('express');

const app = express();
app.use(express.static('dist'));
const httpServer = app.listen(8080);
const socketServer = socketIO(httpServer, { path: '/ws' });

const vapidKeys = webpush.generateVAPIDKeys();

webpush.setVapidDetails(
  'mailto:example@example.com',
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

const socketPlayerMap = new Map();
const pushSubscriptions = new Map();

socketServer.on('connection', (socket) => {
  // Safety measure against trolls.
  if (socketPlayerMap.size > 50) {
    return socket.disconnect(true);
  }

  const ip = socket.request.connection.remoteAddress;

  const sendUpdatePlayers = () => {
    const players = [...socketPlayerMap.values()];
    sendToAll({type: 'players', players});
    if (players.length >= 1) {
      [...pushSubscriptions.values()].forEach(pushSubscription => {
        webpush.sendNotification(pushSubscription, `${players.length} people want to play CTF now!`);
      });
    }
  };

  const sendVapidPublicKey = () => {
    send({type: 'vapid', key: vapidKeys.publicKey});
  };

  sendUpdatePlayers();
  sendVapidPublicKey();

  socket.on('message', packet => {
    if (packet.type === 'join') {
      // Rudimentary name sanitization. Lord knows some troll will come and ruin
      // the party no matter what.
      const name = packet.name.slice(0, 20).replace(/[^a-zA-Z0-9-]+/, '');
      if (name === '') {
        return socket.disconnect(true);
      }

      socketPlayerMap.set(ip, name);
      sendUpdatePlayers();
    } else if (packet.type === 'leave') {
      socketPlayerMap.delete(ip);
      sendUpdatePlayers();
    } else if (packet.type === 'begin-push-subscription') {
      pushSubscriptions.set(ip, packet.pushSubscription);
    } else if (packet.type === 'end-push-subscription') {
      pushSubscriptions.delete(ip);
    }
  });

  socket.on('disconnect', () => {
    sendUpdatePlayers();
  });

  function send(data) {
    socket.emit('message', data);
  }

  function sendToAll(data) {
    socketServer.sockets.emit('message', data);
  }
});
