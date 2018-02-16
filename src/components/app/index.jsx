import React from 'react'
import HTML5Backend from 'react-dnd-html5-backend'
import { DragDropContext } from 'react-dnd'

import AppNav from './nav'

class App extends React.Component {
  render() {
    const { params } = this.props

    return (
      <div className="app">
        <AppNav params={params} />
        {/* Subroutes are added here */}
        {this.props.children}
      </div>
    )
  }
}

export default DragDropContext(HTML5Backend)(App)
