import React from 'react';
import {connect} from 'react-redux';
import _ from 'underscore';

import {fetchMilestones, fetchIssues} from '../redux/ducks/issue';
import {getCardColumn, UNCATEGORIZED_NAME, getReposFromStr} from '../helpers';
import LabelBadge from './label-badge';

import d3 from 'd3'; // eslint-disable-line
import gantt from '../gantt-chart';


const filterByMilestoneAndKanbanColumn = (cards) => {
  const data = {};
  const columns = {};
  const columnCounts = {}; // key is columnName
  const add = (card) => {
    if (card.issue.milestone) {
      const column = getCardColumn(card);
      const columnName = column.name;
      columns[columnName] = column;
      const msCounts = data[card.issue.milestone.title] || {};
      data[card.issue.milestone.title] = msCounts;
      msCounts[columnName] = msCounts[columnName] || 0;
      msCounts[columnName] += 1;

      columnCounts[columnName] = columnCounts[columnName] || 0;
      columnCounts[columnName] += 1;
    } else {
      // TODO: Should account for issues not in a milestone somehow
    }
  };

  cards.forEach((card) => {
    add(card);
  });
  return {data, columns: _.values(columns), columnCounts};
};


const GanttChart = React.createClass({
  componentWillMount() {
    this.props.dispatch(fetchMilestones(this.props.repoInfos[0].repoOwner, this.props.repoInfos[0].repoName));
    this.props.dispatch(fetchIssues(this.props.repoInfos));
  },
  componentDidMount() {
    this.renderChart();
  },
  componentDidUpdate() {
    this.renderChart();
  },
  renderChart() {
    const {milestones, data, columns} = this.props;
    const now = new Date();

    this._ganttWrapper.innerHTML = '';

    const tasks = milestones.map((milestone) => {
      const {createdAt, dueOn, title, state, closedIssues, openIssues} = milestone;
      const dueAt = dueOn ? new Date(dueOn) : null;
      let status;
      if (dueAt && dueAt.getTime() < now.getTime()) {
        status = 'milestone-status-overdue';
      } else {
        status = `milestone-status-${state}`;
      }
      const segments = [];
      if (closedIssues) {
        segments.push({count: closedIssues, color: '666666', title: 'Closed Issues'});
      }
      let accountedForCount = 0;
      _.each(columns, ({name, color}) => {
        if (data[milestone.title]) {
          const count = data[milestone.title][name] || 0;
          if (count) {
            accountedForCount += count;
            segments.push({count, color, title:name});
          }
        }
      });
      if (accountedForCount !== openIssues) {
        segments.push({count: openIssues - accountedForCount, color: 'ffffff', title: 'Other Open Issues'});
      }
      return {
        startDate: createdAt,
        endDate: dueAt || now,
        taskName: title,
        status: status,
        segments: segments
      };
    });

    const taskStatus = {
      'milestone-status-overdue': 'milestone-status-overdue',
      'milestone-status-open' : 'milestone-status-open',
      'milestone-status-closed' : 'milestone-status-closed'
    };

    const taskNames = tasks.map(({taskName}) => taskName).sort();

    tasks.sort(function(a, b) {
      return a.endDate - b.endDate;
    });
    const maxDate = tasks[tasks.length - 1].endDate;
    tasks.sort(function(a, b) {
      return a.startDate - b.startDate;
    });
    // const minDate = tasks[0].startDate;

    const format = '%H:%M';

    const chart = gantt(taskNames.length).taskTypes(taskNames).taskStatus(taskStatus).tickFormat(format).selector('#the-gantt-chart');
    chart(tasks);


    function changeTimeDomain(timeDomainString) {
      let format;
      switch (timeDomainString) {
      case '1hr':
        format = '%H:%M:%S';
        chart.timeDomain([ d3.time.hour.offset(maxDate, -1), maxDate ]);
        break;
      case '3hr':
        format = '%H:%M';
        chart.timeDomain([ d3.time.hour.offset(maxDate, -3), maxDate ]);
        break;
      case '6hr':
        format = '%H:%M';
        chart.timeDomain([ d3.time.hour.offset(maxDate, -6), maxDate ]);
        break;
      case '1day':
        format = '%H:%M';
        chart.timeDomain([ d3.time.day.offset(maxDate, -1), maxDate ]);
        break;
      case '1week':
        format = '%m/%d';
        chart.timeDomain([ d3.time.day.offset(maxDate, -7), maxDate ]);
        break;
      default:
        format = '%H:%M';
      }
      chart.tickFormat(format);
      chart.redraw(tasks);
    }

    changeTimeDomain('1week');

  },
  render() {
    const {columns, columnCounts, milestones} = this.props;

    const legend = columns.map((label) => {
      return (
        <LabelBadge key={label.name} label={label} extra={columnCounts[label.name]}/>
      );
    });
    let closedCount = 0;
    milestones.forEach((milestone) => {
      closedCount += milestone.closedIssues;
    });
    return (
      <div className='-gantt-chart-and-legend'>
        <div ref={r => this._ganttWrapper = r} id='the-gantt-chart'/>
        <h3>Legend</h3>
        <p>Blue vertical line is Today</p>
        <LabelBadge key='completed' label={{name:'0 - Closed', color: '666666'}} extra={closedCount}/>
        {legend}
        <br/>{/* Add breaks to increase padding because I'm lazy and don't want to add CSS margins */}
        <br/>
      </div>
    );
  }

});

export default connect((state, ownProps) => {
  const {milestoneTitles} = state.settings;

  let {data, columns, columnCounts} = filterByMilestoneAndKanbanColumn(state.issues.cards);

  columns = _.sortBy(columns, ({name}) => {
    if (name === UNCATEGORIZED_NAME) {
      // make sure Uncategorized is the left-most column
      return -1;
    } else {
      const result = /^(\d+)/.exec(name);
      return result && result[1] || name;
    }
  });
  columns = columns.reverse();

  // Remove milestones that are not in the URL filter
  let milestones;
  if (milestoneTitles.length > 0) {
    milestones = state.issues.milestones.filter((milestone) => {
      return milestoneTitles.indexOf(milestone.title) >= 0;
    });
  } else {
    milestones = state.issues.milestones;
  }
  return {
    milestones,
    data,
    columns,
    columnCounts,
    repoInfos: getReposFromStr((ownProps.params || {}).repoStr || ''),
  };
})(GanttChart);
