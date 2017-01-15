import React from 'react';
import _ from 'underscore';
import Client from '../github-client';
import * as BS from 'react-bootstrap';
import {CheckIcon, GiftIcon} from 'react-octicons';

const GameModalInner = React.createClass({
  render() {
    const {dropDown} = this.props;

    return (
      <BS.Modal className='game-modal' {...this.props}>
        <BS.Modal.Header closeButton>
          <BS.Modal.Title><GiftIcon size='mega'/> You found it! {dropDown} <small style={{display: 'inline-block', marginLeft: '3rem'}}>Keys: <kbd>Z</kbd> to undo, <kbd>R</kbd> to reset, <kbd>X</kbd> for action</small></BS.Modal.Title>
        </BS.Modal.Header>
        <BS.Modal.Body>
          <div className='game-wrapper'>
            {this.props.children}
          </div>
        </BS.Modal.Body>
      </BS.Modal>
    );
  }
});

// Gist search: `puzzlescript filename:'script.txt' anon:true`
const ALL_GAMES = [
  { name: 'Boxes & Balloons', id: 'ac003a3b7e159dd54eb8' },
  { name: 'Beam Islands', id: '11359118' },
  { name: 'cute train', note: 'short', id: '9121824' },
  { name: 'SwapBot', id: '0590a6662f9e8e6afe4a' },
  { name: 'Sokobouros', note: 'short', id: 'd210a5248fa713153950' },
  { name: 'Skipping Stones to Lonely Homes', id: 'd6fd6fcf84de185e2584' },
  { name: 'Rock Paper Scissors', id: '62070c89dc7604de2484' },
  { name: 'Sokobond', id: '7005648' },
  { name: 'You\'re Pulleying my Leg', id: '11345687' },
  { name: 'Aunt Flora\'s Mansion', id: 'dca39858ca7ca7fcbe20' },
  { name: 'Cyber-Lasso', id: 'e3e444f7c63fb21b6ec0' }, // slow bc of `new Function() and no global`
  { name: 'Bubble Butler', id: '7347484' },
  { name: 'Marble Shoot', id: 'd688de5e0e1e978f63fd' },
  { name: 'Spacekoban', note: 'short', id: '6a6c07f71d7039e4155e' },
  { name: 'Pushcat Jr', id: 'a8f4e5aed01de7c9ef50' },
  { name: 'Push', id: '9867759' },
  { name: 'Gobble Rush', id: '9582263' },
  { name: 'Aaaah! I\'m Being Attacked by a Giant Tentacle!', id: 'cffeb1b80f76458b742a' },
  { name: 'A Good Tunnel is hard to dig', id: 'ddd34751c0a09df5b6f9' },
  { name: 'Train Braining', id: 'a4195276e6979f5bdb21' }
];


const GameModal = React.createClass({
  getInitialState() {
    return {isPlaying: false};
  },
  componentDidMount() {
    if (this.props.show) {
      this.startupGame();
    }
  },
  componentDidUpdate(oldProps) {
    if (this.props.show && !oldProps.show) {
      this.startupGame();
    }
  },
  setLastPlayed(gistId) {
    const now = (new Date()).toISOString();
    window.localStorage.setItem('game-' + gistId + '-last-played', now);
  },
  getGamesWon() {
    const gamesWonStr = window.localStorage.getItem('games-won');
    let gamesWon;
    if (gamesWonStr) {
      gamesWon = JSON.parse(gamesWonStr);
    } else {
      gamesWon = {};
    }
    return gamesWon;
  },
  addGamesWon(gistId) {
    const gamesWon = this.getGamesWon();
    gamesWon[gistId] = (new Date()).toISOString();
    window.localStorage.setItem('games-won', JSON.stringify(gamesWon));
  },
  startupGame(game) {
    // Fetch the gist and then async load the GameEngine

    // If no game is provided, find the 1st one that has not been won
    if (!game) {
      const gamesWon = this.getGamesWon();

      // filter the games by ones that are won. Then pick the 1st.
      const games = _.filter(ALL_GAMES, ({id}) => {
        return !gamesWon[id];
      });

      game = games[0];
    }
    if (!game) {
      /*eslint-disable no-alert */
      alert('You have finished all the games. Wow. Check back later for more!');
      /*eslint-enable no-alert */
    } else {
      const gistId = game.id;
      Client.getOcto().gists(gistId).fetch()
      .then((gist) => {
        const gameData = gist.files['script.txt'].content;

        this.asyncStartEngine(gistId, gameData);
      });
    }
  },
  asyncStartEngine(gistId, gameData) {
    // Load the game engine from a separate bundle
    const that = this;
    /*eslint-disable no-undef */
    require.ensure([], (require) => {
      const GameEngine = require('puzzle-script');
      that._startEngine(GameEngine, gistId, gameData);
    });
  },
  onHide() {
    // Load the game engine from a separate bundle
    const that = this;
    /*eslint-disable no-undef */
    require.ensure([], (require) => {
      const GameEngine = require('puzzle-script');
      /*eslint-enable no-undef */
      that._stopEngine(GameEngine);
    });
  },
  // GameEngine is passed in as an additional argument because it loaded
  // from a separate bundle to reduce the size of the javascript file
  // (if you are not using the code, do not bother loading it)
  _startEngine(GameEngine, gistId, gameData) {
    /*eslint-enable no-undef */
    const canvasNode = this.refs.gameCanvas;
    const {isPlaying} = this.state;
    if (isPlaying) {
      GameEngine.stop(canvasNode);
    }
    GameEngine.setOnWinGame(() => {
      // When the user wins a game remember that in localStorage.
      // That way, the next game becomes available
      this.addGamesWon(gistId);
      /*eslint-disable no-alert */
      alert('Congrats! You unlocked another game!\n\nThe next one is not ready yet but check back in a day or 2... it will be');
      /*eslint-enable no-alert */
    });
    GameEngine.useDefaultSaveAndLoad('game-' + gistId);
    GameEngine.start(canvasNode, gameData);
    this.setLastPlayed(gistId);
    this.setState({isPlaying: true});
  },
  _stopEngine(GameEngine) {
    const {isPlaying} = this.state;
    if (isPlaying) {
      GameEngine.stop();
    }
    this.setState({isPlaying: false});
    this.props.onHide();
  },
  render() {
    const {isPlaying} = this.state;
    const gamesWon = this.getGamesWon();
    // const winCount = Object.keys(gamesWon).length;
    // const availableGames = ALL_GAMES.slice(0, winCount < 6 ? winCount + 3 : ALL_GAMES.length);
    const availableGames = ALL_GAMES;

    const unlockedGames = _.map(availableGames, (game) => {
      let winIcon;
      if (gamesWon[game.id]) {
        winIcon = (
          <CheckIcon/>
        );
      }
      return (
        <BS.MenuItem key={game.id} onSelect={() => this.startupGame(game)}>
          {game.name}
          {' '}
          {winIcon}
        </BS.MenuItem>
      );
    });

    // const nextGames = _.map(ALL_GAMES.slice(winCount + 3, winCount + 3 + 2), (game) => {
    //   return (
    //     <BS.MenuItem disabled>
    //       {game.name.replace(/[A-Za-z]/g, '?')}
    //     </BS.MenuItem>
    //   );
    // });

    const dropDown = (
      <BS.DropdownButton id='change-game' title='Change Game' bsStyle='primary' style={{display: 'inline'}}>
        <BS.MenuItem header>Unlocked Games</BS.MenuItem>
        {unlockedGames}
        { /*
        <BS.MenuItem divider/>
        <BS.MenuItem header>Locked Games</BS.MenuItem>
        {nextGames}
        <BS.MenuItem disabled>... Finish a game to unlock more!</BS.MenuItem>
        */}
      </BS.DropdownButton>
    );
    const className = {'secret-game-is-playing' : isPlaying};
    return (
      <GameModalInner {...this.props} onHide={this.onHide} dropDown={dropDown} className={className}>
        <canvas ref='gameCanvas'/>
      </GameModalInner>
    );
  }
});

export default GameModal;
