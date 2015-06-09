import React from 'react';
import {Link, RouteHandler} from 'react-router';
import BS from 'react-bootstrap';
import HTML5Backend from 'react-dnd/modules/backends/HTML5';
import { DragDropContext } from 'react-dnd';

import LoginModal from './login-modal.jsx';

const App = React.createClass({
  render: () => {
    const brand = (
      <Link to='viewDashboard'>Dashboard</Link>
    );
    return (
      <div className='app'>
        <BS.Navbar brand={brand} toggleNavKey={0}>
          <BS.Nav right eventKey={0}>
            <BS.ModalTrigger modal={<LoginModal/>}>
              <BS.Button eventKey={1}>Login</BS.Button>
            </BS.ModalTrigger>
          </BS.Nav>
        </BS.Navbar>

        {/* Subroutes are added here */}
        <RouteHandler/>
      </div>
    );
  }
});

export default DragDropContext(HTML5Backend)(App);
