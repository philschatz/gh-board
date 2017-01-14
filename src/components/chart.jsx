/**
 * React-C3 Chart
 * Copyright 2015 - Cody Reichert <codyreichert@gmail.com>
 */

import c3    from 'c3';
import React from 'react';

const ChartComponent = React.createClass({
  displayName: 'React-C3-Chart',

  propTypes: {
    className: React.PropTypes.string,
    data: React.PropTypes.object.isRequired,
    element: React.PropTypes.string.isRequired,
    options: React.PropTypes.object
  },

  chart: null,

  shouldComponentUpdate: function(nextProps) {
    if(this.props.data.rows.length
          !== nextProps.data.rows.length) { // shallow check
      return true;
    } else if(JSON.stringify(this.props.data.rows)
            !== JSON.stringify(nextProps.data.rows)) { // deeper check
      return  true;
    }
    return false;
  },

  componentDidMount: function() {
    this._generateChart(
      this.props.data,
      this.props.element,
      this.props.options
    );
  },

  componentDidUpdate: function(prevProps) {
    if(prevProps.data.rows !== this.props.data.rows) {
      this._generateChart(
        this.props.data,
        this.props.element,
        this.props.options
      );
    }
  },

  componentWillUnmount: function() {
    this._destroyChart();
  },

  _generateChart: function(data, element, options) {
    let build = Object.assign({}, {
      bindto: '#' + element,
      data: data
    }, options);
    this.chart = c3.generate(build);
  },

  _destroyChart: function() {
    this.chart.destroy();
  },

  render: function() {
    let className;
    if (this.props.className) {
      className = 'c3 ' + this.props.className;
    } else {
      className = 'c3';
    }
    return (
      <div className={className}
           id={this.props.element}
           style={this.props.styles}>
      </div>
    );
  }
});


export default ChartComponent;
