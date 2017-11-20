import React from 'react';
import * as BS from 'react-bootstrap';
import {CloudDownloadIcon, MarkGithubIcon} from 'react-octicons';

import Client from '../../github-client';
import NewVersionChecker from '../../new-version-checker';

import Time from '../time';
import GameModal from '../game-modal';
import GithubFlavoredMarkdown from '../gfm';
import SavedFiltersButton from './saved-filters';

const KarmaWarning = React.createClass({
  getInitialState() {
    return {timer: null, limit: null, remaining: null, newestVersion: null, isConnected: true};
  },
  componentDidMount() {
    NewVersionChecker.on('change', this.updateNewestVersion);
    Client.on('end', this.updateRateLimit);
  },
  componentWillUnmount() {
    NewVersionChecker.off('change', this.updateNewestVersion);
    Client.off('request', this.updateRateLimit);
  },
  // ('end', eventId, {method, path, data, options}, jqXHR.status, emitterRate)
  updateRateLimit(eventId, config, status, rate) {
    if (status !== 0 && rate) {
      const {remaining, limit, reset} = rate;
      this.setState({remaining, limit, reset: new Date(reset * 1000), isConnected: true});
    } else {
      this.setState({remaining:0, isConnected: false});
    }
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
    const {remaining, limit, reset, newestVersion, isGameOpen, isConnected} = this.state;
    let karmaText;
    let resetText;
    if (reset) {
      resetText = (
        <span className='reset-at'>Resets <Time dateTime={reset}/></span>
      );
    }

    let isKarmaLow = true;
    if (isConnected) {
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
    } else {
      karmaText = (<span>You do not seem to be connected to the internet</span>);
    }

    let newestText = null;
    if (newestVersion) {
      newestText = (
        <button className='btn btn-primary' onClick={() => window.location.reload(true)}>gh-board updated <Time dateTime={new Date(newestVersion.date)}/>: "<GithubFlavoredMarkdown text={newestVersion.message} inline={true} repoOwner='philschatz' repoName='gh-pages' />". Click to Reload</button>
      );
    }
    return (
      <BS.Navbar fixedBottom className='bottombar-nav'>
        <BS.Nav>
          <li>
            <span className={'karma-stats' + (isKarmaLow && ' is-karma-low' || '')}>
              <CloudDownloadIcon title='GitHub API'/>
              {' API Requests Left: '}
              {karmaText}
              {resetText}
            </span>
          </li>
          {newestText}
        </BS.Nav>
        <BS.Nav pullRight>
          <BS.NavItem className='nav-secret-game' onClick={this.showGameModal}><GiftIcon title='Oooh, a present!'/></BS.NavItem>
          <BS.NavItem target='_blank' href='https://github.com/philschatz/gh-board'><MarkGithubIcon/> Source Code</BS.NavItem>
          <SavedFiltersButton/>
        </BS.Nav>
        <GameModal show={isGameOpen} onHide={this.onHideGameModal}/>
      </BS.Navbar>
    );
  }
});

export default KarmaWarning;
