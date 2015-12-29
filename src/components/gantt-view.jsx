import React from 'react';

import IssueStore from '../issue-store';
import Client from '../github-client';
import {getReposFromStr} from '../helpers';
import Loadable from './loadable';

import d3 from 'd3';
import gantt from '../gantt-chart';


const GanttChart = React.createClass({
  componentDidMount() {
    const {milestones} = this.props;
    const now = new Date();
    const tasks = milestones.map((milestone) => {
      const {createdAt, dueOn, title, state, closedIssues, openIssues} = milestone;
      const dueAt = dueOn ? new Date(dueOn) : null;
      let status;
      if (dueAt && dueAt.getTime() < now.getTime()) {
        status = 'milestone-status-overdue';
      } else {
        status = `milestone-status-${state}`;
      }
      let percent;
      if (closedIssues + openIssues) {
        percent = closedIssues / (closedIssues + openIssues);
      } else {
        percent = Math.random(); //TODO: HACK to just show something "interesting"
      }
      return {
        startDate: createdAt,
        endDate: dueAt || now,
        taskName: title,
        status: status,
        percent: percent,
        progress: closedIssues,
        progressTotal: closedIssues + openIssues
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
    return (
      <div ref='ganttWrapper' id='the-gantt-chart'/>
    );
  }

});

const RepoKanbanShell = React.createClass({
  componentWillMount() {
    // Needs to be called before `render()`
    IssueStore.startPolling();
  },
  componentWillUnmount() {
    IssueStore.stopPolling();
  },
  renderLoaded(allMilestones) {
    return (
      <GanttChart milestones={allMilestones}/>
    );
  },
  render() {
    let {repoStr} = this.props.params;
    const repoInfos = getReposFromStr(repoStr);
    // Get the "Primary" repo for milestones and labels
    const [{repoOwner, repoName}] = repoInfos;

    // TODO: Actually do all the milestones
    const allMilestones = Client.getOcto().repos(repoOwner, repoName).milestones.fetch();

    return (
      <Loadable
        promise={allMilestones}
        renderLoaded={this.renderLoaded}
      />
    );
  }
});

export default RepoKanbanShell;
