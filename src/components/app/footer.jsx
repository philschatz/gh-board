import _ from 'underscore';
import React from 'react';
import {Link, History} from 'react-router';
import * as BS from 'react-bootstrap';
import HTML5Backend from 'react-dnd-html5-backend';
import { DragDropContext } from 'react-dnd';

import SettingsStore from '../../settings-store';
import Client from '../../github-client';
import NewVersionChecker from '../../new-version-checker';
import CurrentUserStore from '../../user-store';
import FilterStore from '../../filter-store';
import IssueStore from '../../issue-store';
import history from '../../history';
import {getReposFromStr, convertRepoInfosToStr} from '../../helpers';

import LoginModal from '../login-modal';
import LabelBadge from '../label-badge';
import MoveModal from '../move-modal';
import Time from '../time';
import Loadable from '../loadable';
import GithubFlavoredMarkdown from '../gfm';

import GameModal from '../game-modal';


const KarmaWarning = React.createClass({
  getInitialState() {
    return {timer: null, limit: null, remaining: null, newestVersion: null};
  },
  componentDidMount() {
    NewVersionChecker.on('change', this.updateNewestVersion);
    Client.on('request', this.updateRateLimit);
  },
  componentWillUnmount() {
    NewVersionChecker.off('change', this.updateNewestVersion);
    Client.off('request', this.updateRateLimit);
  },
  updateRateLimit({rate: {remaining, limit, reset}} /*, method, path, data, options */) {
    this.setState({remaining, limit, reset: new Date(reset * 1000)});
  },
  updateNewestVersion(newestVersion) {
    this.setState({newestVersion});
  },
  showGameModal() {
    this.setState({isGameOpen: true});
  },
  onHideGameModal() {
    this.setState({isGameOpen: false});
  },
  render() {
    const {remaining, limit, reset, newestVersion, isGameOpen} = this.state;
    let karmaText;
    let resetText;
    if (reset) {
      resetText = (
        <span className='reset-at'>Resets <Time dateTime={reset}/></span>
      );
    }

    let isKarmaLow = true;
    if (limit) {
      if (remaining / limit < .2) {
        karmaText = (
          <BS.Button bsStyle='danger' bsSize='sm'>{remaining} / {limit}. Sign In to avoid this. {resetText}</BS.Button>
        );
        resetText = null;
      } else {
        isKarmaLow = false;
        const percent = Math.floor(remaining * 1000 / limit) / 10;
        let bsStyle = 'danger';
        if (percent >= 75) { bsStyle = 'success'; }
        else if (percent >= 40) { bsStyle = 'warning'; }
        karmaText = (
          <BS.ProgressBar
            className='karma-progress'
            title={'Rate Limit for the GitHub API (' + remaining + '/' + limit + ')'}
            now={remaining}
            max={limit}
            bsStyle={bsStyle}
            label={percent + '% (' + remaining + ')'} />
        );
      }
    }

    let newestText = null;
    if (newestVersion) {
      newestText = (
        <button className='btn btn-primary' onClick={() => window.location.reload(true)}>New Version released <Time dateTime={new Date(newestVersion.date)}/>. Click to Reload</button>
      );
    }
    return (
      <BS.Navbar fixedBottom className='bottombar-nav'>
        <BS.Nav>
          <li>
            <span className={'karma-stats' + (isKarmaLow && ' is-karma-low' || '')}>
              <i className='octicon octicon-cloud-download' title='GitHub API'/>
              {' API Requests Left: '}
              {karmaText}
              {resetText}
            </span>
          </li>
          {newestText}
        </BS.Nav>
        <BS.Nav pullRight>
          <BS.NavItem className='nav-squirrel' onClick={this.showGameModal}><i className='octicon octicon-gift' title='Oooh, a present!'/></BS.NavItem>
          <BS.NavItem target='_blank' href='https://github.com/philschatz/gh-board'><i className='octicon octicon-mark-github'/> Source Code</BS.NavItem>
        </BS.Nav>
        <GameModal show={isGameOpen} onHide={this.onHideGameModal}/>
      </BS.Navbar>
    );
  }
});

export default KarmaWarning;
