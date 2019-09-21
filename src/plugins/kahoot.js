import Vue from "vue";
import { Adapters } from "kahoot-api";

async function wait(ms) {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
}

class PlayerGroup {
  constructor(name, target) {
    this.name = name;
    this.players = [];
    this.joined = 0;
    this.errored = 0;
    this.target = target;
    this.selected = false;
  }

  get totalPlayers() {
    return this.joined + this.errored;
  }
}

const manager = new Vue({
  data() {
    return {
      pin: null,
      session: null,
      socket: null,
      groups: []
    };
  },
  methods: {
    async initPlayer() {
      const socket = await this.session.openSocket();
      const player = await new Adapters.Player(socket);
      return player;
    },
    addPlayerGroup(name, amount) {
      return new Promise(async (resolve, reject) => {
        const group = new PlayerGroup(name, amount);
        this.groups.push(group);

        for (let i = 0; i < amount; i++) {
          this.initPlayer().then(player => {
            const finalName = `${name}-${i}`;

            group.players.push(player);
            return player
              .join(finalName)
              .then(() => {
                group.joined++;
              })
              .catch(error => {
                group.errored++;
                reject(error);
              });
          });

          await wait(150);
        }

        resolve(group);
      });
    },
    getGroupByName(name) {
      return this.groups.filter(group => group.name === name);
    },
    getSelectedGroups() {
      return this.groups.filter(group => group.selected);
    },
    getSelectedPlayers() {
      const groups = this.getSelectedGroups();
      let players = [];

      for (let i = 0; i < groups.length; i++) {
        const group = groups[i];
        players = players.concat(group.players);
      }

      return players;
    },
    removeSelectedGroups() {
      const selected = this.getSelectedGroups();
      selected.forEach(playerGroup => {
        for (let i = 0; i < playerGroup.players.length; i++) {
          const player = playerGroup.players[i];
          player.leave();
        }

        this.groups.splice(this.groups.indexOf(playerGroup), 1);
      });
    }
  }
});

export default {
  install(MainVue) {
    MainVue.prototype.$kahoot = manager;
  }
};