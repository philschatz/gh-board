import React from 'react';
import {Link, RouteHandler} from 'react-router';
import BS from 'react-bootstrap';
import HTML5Backend from 'react-dnd/modules/backends/HTML5';
import { DragDropContext } from 'react-dnd';

import Client from '../github-client';
import LoginModal from './login-modal.jsx';

const KarmaWarning = React.createClass({
  getInitialState() {
    return {timer: null, limit: null, remaining: null};
  },
  componentDidMount() {
    this.setState({timer: setInterval(this.pollKarma, 10000)});
  },
  componentDidUnmount() {
    clearInterval(this.pollKarma);
  },
  pollKarma() {
    Client.getOcto().rateLimit.fetch().then((rates) => {
      const {remaining, limit} = rates.resources.core;
      this.setState({remaining, limit});
    });
  },
  render() {
    const {remaining, limit} = this.state;
    let karmaText;
    if (remaining / limit < .2) {
      karmaText = (
        <BS.Button bsStyle='warning'>Running low on GitHub Karma: {remaining} / {limit} Either slow down or log in</BS.Button>
      );
    } else {
      karmaText = (
        <span className='lots-of-karma'>GitHub Karma: {remaining} / {limit}</span>
      );
    }
    return (
      <BS.Navbar fixedBottom>
        <BS.Nav>
          {karmaText}
        </BS.Nav>
      </BS.Navbar>
    );
  }
});

const LoginButton = React.createClass({
  getInitialState() {
    return {info: null};
  },
  componentDidMount() {
    Client.on('changeToken', this.onChangeToken);
    this.onChangeToken();
  },
  componentDidUnmount() {
    Client.off('changeToken', this.onChangeToken);
  },
  onChangeToken() {
    if (Client.hasCredentials()) {
      Client.getOcto().me.fetch().then((info) => {
        this.setState({info});
      }).catch(() => {
        this.setState({info: null});
      });
    } else {
      this.setState({info: null});
    }
  },
  onSignOut() {
    Client.setToken(null);
  },
  render() {
    const {info} = this.state;
    if (info) {
      const avatar = <img className='avatar' src={info.avatar.url}/>;
      return (
        <BS.DropdownButton className='logoff' title={avatar}>
          <BS.MenuItem disabled href='https://github.com'>Signed in as <strong>{info.login}</strong></BS.MenuItem>
          <BS.MenuItem divider/>
          <BS.MenuItem eventKey='1' onClick={this.onSignOut}>Sign Out</BS.MenuItem>
        </BS.DropdownButton>
      );
    } else {
      return (
        <BS.ModalTrigger modal={<LoginModal/>}>
          <BS.Button eventKey={1}>Sign In</BS.Button>
        </BS.ModalTrigger>
      );
    }
  }
});

const App = React.createClass({
  render() {
    const brand = (
      <Link to='viewDashboard'>Dashboard</Link>
    );
    return (
      <div className='app'>
        <BS.Navbar className='topbar-nav' brand={brand} toggleNavKey={0}>
          <BS.Nav right eventKey={0}>
            <LoginButton/>
          </BS.Nav>
        </BS.Navbar>

        {/* Subroutes are added here */}
        <RouteHandler/>

        <KarmaWarning/>
      </div>
    );
  }
});

export default DragDropContext(HTML5Backend)(App);
