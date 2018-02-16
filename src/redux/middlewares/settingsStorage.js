export default ({ getState }) => next => action => {
  const result = next(action)
  if (action && action.meta && action.meta.updateSettingStorage) {
    window.localStorage.setItem(
      'gh-board-settings',
      JSON.stringify(getState().settings)
    )
  }
  return result
}
