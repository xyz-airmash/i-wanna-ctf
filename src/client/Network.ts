import * as io from "socket.io-client";

export class Network {
  public vapidPublicKey: string;
  private onPlayersChangedListener: (s: string[]) => void;
  private onStatusUpdateListener: (s: any) => void;
  private socket: any;

  public setup() {
    this.socket = io({ path: '/ws' });
    this.socket.on('message', (packet: any) => {
      if (packet.type === 'players') {
        if (this.onPlayersChangedListener) {
          this.onPlayersChangedListener(packet.players);
        }
      } else if (packet.type === 'vapid') {
        this.vapidPublicKey = packet.key;
      } else if (packet.type === 'status') {
        if (this.onStatusUpdateListener) {
          this.onStatusUpdateListener(packet);
        }
      }
    });
  }

  public join(name: string) {
    this.send({type: 'join', name});
  }

  public leave() {
    this.send({type: 'leave'});
  }

  public requestStatusUpdate() {
    this.send({type: 'status'});
  }

  public beginPushSubscription(pushSubscription: any) {
    this.send({type: 'begin-push-subscription', pushSubscription});
  }

  public endPushSubscription() {
    this.send({type: 'end-push-subscription'});
  }

  public onPlayersChanged(callback: (s: string[]) => void) {
    this.onPlayersChangedListener = callback;
  }

  public onStatusUpdate(callback: (s: any) => void) {
    this.onStatusUpdateListener = callback;
  }

  private send(data: any) {
    if (this.socket) {
      this.socket.emit('message', data);
    }
  }
  
};