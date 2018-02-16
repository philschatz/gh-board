import React from 'react'
import { connect } from 'react-redux'
import classnames from 'classnames'

import { isLight } from '../helpers'

const ColoredIcon = React.createClass({
  render() {
    let { className, children, name, color } = this.props

    let headerStyle
    let isLightColor = false
    if (color) {
      headerStyle = { backgroundColor: '#' + color }
      isLightColor = isLight(color)
    } else {
      isLightColor = true
    }
    className = classnames(className, 'colored-icon', {
      'is-light': isLightColor,
    })
    if (name) {
      name = name.replace(this.props.columnRegExp, '')
    }

    return (
      <span className={className} style={headerStyle} title={name}>
        {children}
      </span>
    )
  },
})

export default connect(state => {
  return {
    columnRegExp: state.settings.columnRegExp,
  }
})(ColoredIcon)
