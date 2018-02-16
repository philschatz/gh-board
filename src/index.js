import 'babel-polyfill'
import * as React from 'react' // eslint-disable-line
import ReactDOM from 'react-dom'
import { Router } from 'react-router'
import { Provider } from 'react-redux'
import Recordo from 'recordo'
import { store, history } from './redux/store'
import { fetchEmojis } from './redux/ducks/emojis'
import routes from './router'

Recordo.initialize()

// Use hashHistory because there is a <MenuItem> in <App> that explicitly tacks on a "#"
// Also, gh-pages does not support arbitrary URLs so the repos need to be in the hash
const root = (
  <Provider store={store}>
    <Router history={history} routes={routes} />
  </Provider>
)

ReactDOM.render(root, document.getElementById('container'))

store.dispatch(fetchEmojis())
