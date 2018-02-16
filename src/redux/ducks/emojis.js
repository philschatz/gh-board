import Duck from 'reduck'

import { FETCH_EMOJIS } from '../actions'

let storedSettings
try {
  storedSettings = JSON.parse(window.localStorage.getItem('gh-board-emojis'))
} catch (err) {
  storedSettings = undefined
}

const DEFAULT_STATE = {}

const initialState = storedSettings || DEFAULT_STATE

const duck = new Duck('emojis', initialState)

export const fetchEmojis = duck.defineAction(FETCH_EMOJIS, {
  creator() {
    return {
      meta: {
        updateEmojisStorage: true,
        github: { action: 'fetchEmojis' },
      },
    }
  },
  resolve(state, { payload }) {
    return payload
  },
})

export default duck.reducer
