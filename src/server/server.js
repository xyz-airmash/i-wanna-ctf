const socketIO = require('socket.io');
const webpush = require('web-push');
const express = require('express');
const redis = require('redis');
const { promisify } = require('util');

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

const TTL = 60 * 60 * 12;

const redisClient = redis.createClient();
const redisSet = promisify(redisClient.set).bind(redisClient);
const redisGet = promisify(redisClient.get).bind(redisClient);
const redisDel = promisify(redisClient.del).bind(redisClient);
const redisKeys = promisify(redisClient.keys).bind(redisClient);
const redisExpire = promisify(redisClient.expire).bind(redisClient);

socketServer.on('connection', async (socket) => {
  // Safety measure against trolls.
  if ((await redisKeys('names:*')).size > 50) {
    return socket.disconnect(true);
  }

  const ip = socket.request.connection.remoteAddress;

  const sendUpdatePlayers = async () => {
    const players = await getValues('names');
    sendToAll({type: 'players', players});
    if (players.length >= 10) {
      const pushSubscriptions = (await getValues('push-subs')).map(push => JSON.parse(push));
      pushSubscriptions.forEach(pushSubscription => {
        webpush.sendNotification(subscription, `${players.length} people want to play CTF now!`);
      });
    }
  };

  const sendUpdateStatus = async () => {
    const active = Boolean(await redisGet(`names:${ip}`));
    const players = await getValues('names');
    send({type: 'status', active, players});
  };

  const sendVapidPublicKey = () => {
    send({type: 'vapid', key: vapidKeys.publicKey});
  };

  sendUpdatePlayers();
  sendVapidPublicKey();

  socket.on('message', async (packet) => {
    if (packet.type === 'join') {
      // Rudimentary name sanitization. Lord knows some troll will come and ruin
      // the party no matter what.
      const name = packet.name.slice(0, 20).replace(/[^a-zA-Z0-9- ]+/, '');
      if (name === '') {
        return socket.disconnect(true);
      }

      redisSet(`names:${ip}`, name);
      redisExpire(`names:${ip}`, TTL)
      sendUpdatePlayers();
    } else if (packet.type === 'leave') {
      redisDel(`names:${ip}`);
      sendUpdatePlayers();
    } else if (packet.type === 'begin-push-subscription') {
      redisSet(`push-subs:${ip}`, JSON.stringify(packet.pushSubscription));
      redisExpire(`push-subs:${ip}`, TTL);
    } else if (packet.type === 'end-push-subscription') {
      redisDel(`push-subs:${ip}`);
    } else if (packet.type === 'status') {
      sendUpdateStatus();
    }
  });

  setInterval(async () => {
    sendUpdateStatus();
  }, TTL / 2);

  socket.on('disconnect', () => {
    sendUpdatePlayers();
  });

  function send(data) {
    socket.emit('message', data);
  }

  function sendToAll(data) {
    socketServer.sockets.emit('message', data);
  }

  async function getValues(key) {
    const keys = await redisKeys(`${key}:*`);
    return Promise.all(keys.map(k => redisGet(k)));
  }
});
