import "./styles.scss";
import { h, render, Component } from "preact";
import { Network } from "./Network";
import { getSubscription, unsubscribe, startPushSubscription } from "./Notifications";

interface State {
  name: string,
  players: string[],
  isWaiting: boolean
}

class Lobby extends Component {
  state: State;
  network = new Network();

  constructor() {
    super();
    this.state = {
      name: localStorage.getItem('name') || '',
      players: [],
      isWaiting: false
    };
  }

  async componentDidMount() {
    this.network.setup();
    this.network.onPlayersChanged(players => {
      this.setState({ players });
    });

    this.network.onStatusUpdate(status => {
      this.setState({
        isWaiting: status.active,
        players: status.players
      });
    });
    this.network.requestStatusUpdate();
  }

  render() {
    const { name, players, isWaiting } = this.state;
    const isEmbedded = new URLSearchParams(window.location.search).get('embed') !== null;
    const hasNotificationPermission = Notification.permission === 'granted';
    if (isEmbedded && !hasNotificationPermission) {
      return <div className="background">
        <div className="lobby-wrapper">
          <h1><a href="https://lobby.starma.sh">CTF Lobby</a></h1>
          <div className="notification-message">
            <p>Go to <a href="https://lobby.starma.sh">lobby.starma.sh</a> and allow notifications to enable the CTF lobby.</p>
          </div>
        </div>
      </div>;
    }

    return <div className={isEmbedded ? "background" : "background background-on"}>
      <div className="lobby-wrapper">
        <h1>{isEmbedded ?
          <a href="https://lobby.starma.sh">CTF Lobby</a>
        : "CTF Lobby"
        }</h1>
        {!hasNotificationPermission &&
          <div className="warning">Turn on notifications or the site will not work properly!</div>
        }
        {isWaiting ?
          <div className="form">
            {isEmbedded ?
              <p>When 10 people show up, you will get a push notification.</p>
            : <p>When 10 people show up, you will get a push notification. You can now close this tab.</p>
            }
            <input type="button" value="Leave CTF Lobby" onClick={() => this.leave()} />
          </div>
        :
          <div className="form">
            <form onSubmit={evt => (this.join(name), evt.preventDefault())}>
              <input
                maxLength={20}
                type="text"
                placeholder="My name"
                spellcheck={false}
                value={name}
                autofocus
                onKeyUp={evt => evt.key === 'Enter' && this.join(name)}
                onInput={(evt: any) => this.setState({ name: evt.target.value })} />
              <input type="submit" value="Join CTF Lobby" />
            </form>
          </div>
        }
        {players.length ? <div className="waiting-list">
            <hr />
            <p>Players who are waiting:</p>
            <ul>
              {players.map(player => <li>{player}</li>)}
            </ul>
          </div>
        : false
        }
      </div>
    </div>;
  }

  join(name: string) {
    this.network.join(name);
    this.setState({ isWaiting: true });
    if (this.network.vapidPublicKey) {
      startPushSubscription(this.network.vapidPublicKey)
      .then((pushSubscription: any) => {
        this.network.beginPushSubscription(pushSubscription);
      });
    }
  }

  leave() {
    this.network.leave();
    this.setState({ isWaiting: false });
    unsubscribe();
    this.network.endPushSubscription();
  }
}

render(<Lobby />, document.querySelector('#mount'));