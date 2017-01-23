import React from 'react';
import HTML5Backend from 'react-dnd-html5-backend';
import { DragDropContext } from 'react-dnd';

import AppNav from './nav';
import Footer from './footer';

const App = React.createClass({
  render() {
    const {params} = this.props;

    return (
      <div className="app">
        <AppNav params={params}/>
        {/* Subroutes are added here */}
        {this.props.children}
        <Footer/>
      </div>
    );
  }
});

export default DragDropContext(HTML5Backend)(App);
