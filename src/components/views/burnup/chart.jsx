import c3 from 'c3'

/**
 * React-C3 Chart
 * Copyright 2015 - Cody Reichert <codyreichert@gmail.com>
 */

import PropTypes from 'prop-types'

import React from 'react'

class ChartComponent extends React.Component {
  static displayName = 'React-C3-Chart'

  static propTypes = {
    className: PropTypes.string,
    data: PropTypes.object.isRequired,
    element: PropTypes.string.isRequired,
    options: PropTypes.object,
  }

  chart = null

  shouldComponentUpdate(nextProps) {
    if (this.props.data.rows.length !== nextProps.data.rows.length) {
      // shallow check
      return true
    } else if (
      JSON.stringify(this.props.data.rows) !==
      JSON.stringify(nextProps.data.rows)
    ) {
      // deeper check
      return true
    }
    return false
  }

  componentDidMount() {
    this._generateChart(this.props.data, this.props.element, this.props.options)
  }

  componentDidUpdate(prevProps) {
    if (prevProps.data.rows !== this.props.data.rows) {
      this._generateChart(
        this.props.data,
        this.props.element,
        this.props.options
      )
    }
  }

  componentWillUnmount() {
    this._destroyChart()
  }

  _generateChart = (data, element, options) => {
    let build = Object.assign(
      {},
      {
        bindto: '#' + element,
        data: data,
      },
      options
    )
    this.chart = c3.generate(build)
  }

  _destroyChart = () => {
    this.chart.destroy()
  }

  render() {
    let className
    if (this.props.className) {
      className = 'c3 ' + this.props.className
    } else {
      className = 'c3'
    }
    return (
      <div
        className={className}
        id={this.props.element}
        style={this.props.styles}
      />
    )
  }
}

export default ChartComponent
