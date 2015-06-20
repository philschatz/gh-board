import React from 'react';
import _ from 'underscore';

import {fetchAll, contains} from '../helpers';
import Client from '../github-client';
import Loadable from './loadable.jsx';
import IssueList from './issue-list.jsx';

// Of the form `# - ...`
const KANBAN_LABEL = /^\d+\ -\ /;
const ICEBOX_NAME = '999 - Icebox';

const filterKanbanLabels = (labels) => {
  const kanbanLabels = _.filter(labels, (label) => KANBAN_LABEL.test(label.name));
  // TODO: Handle more than 10 workflow states
  return kanbanLabels.sort();
};

const kanbanLabelName = (label) => label.name.slice(label.name.indexOf('-') + 2);


const KanbanRepo = React.createClass({
  displayName: 'KanbanRepo',
  renderColumn(label, allIssues) {
    const {repoOwner, repoName} = this.props;
    let issues = _.filter(allIssues, (issue) => {
      const containsLabel = contains(issue.labels, (l) => label.name === l.name);
      if (containsLabel) {
        return true;
      } else if (ICEBOX_NAME === label.name) {
        // If the issue does not match any list then add it to the backlog
        for (const l of issue.labels) {
          if (KANBAN_LABEL.test(l.name)) {
            return false;
          }
        }
        // no list labels, so include it in the backlog
        return true;
      }
    });
    return (
      <td>
        <IssueList
          title={kanbanLabelName(label)}
          issues={issues}
          repoOwner={repoOwner}
          repoName={repoName}
          label={label}
        />
      </td>
    );

  },
  renderColumns(labels, allIssues) {
    return _.map(labels, (label) => {
      return this.renderColumn(label, allIssues);
    });
  },
  renderBoard(allIssues) {
    const {labels} = this.props;
    const kanbanLabels = filterKanbanLabels(labels);

    const workflowStateIssues = this.renderColumns(kanbanLabels, allIssues);

    return (
      <table className='kanban-board'>
        <tbody>
          <tr>
            {workflowStateIssues}
          </tr>
        </tbody>
      </table>
    );
  },
  render() {
    const {repoOwner, repoName} = this.props;
    const promise = fetchAll(Client.getOcto().repos(repoOwner, repoName).issues.fetch);

    return (
      <Loadable
        promise={promise}
        renderLoaded={this.renderBoard}
      />
    );
  }
});

const Repo = React.createClass({
  displayName: 'Repo',
  render() {
    const {repoOwner, repoName, data} = this.props;

    // Get all the issue labels first
    const renderLoaded = (labels) => {
      // If there are at least 2 'special' kanban labels then consider it valid
      const kanbanLabels = filterKanbanLabels(labels);
      const icebox = [{name: ICEBOX_NAME}];

      // const isValidKanbanRepo = kanbanLabels.length > 1;

      return (
        <KanbanRepo
          repoOwner={repoOwner}
          repoName={repoName}
          labels={icebox.concat(labels)}
          data={data}
        />
      );
    };

    return (
      <Loadable
        promise={Client.getOcto().repos(repoOwner, repoName).labels.fetch()}
        renderLoaded={renderLoaded}
      />
    );
  }
});

const RepoKanbanShell = React.createClass({
  displayName: 'RepoKanbanShell',
  contextTypes: {
    router: React.PropTypes.func
  },
  render() {
    const {repoOwner, repoName} = this.context.router.getCurrentParams();

    const renderLoaded = (data) => {
      return (
        <Repo {...this.props}
          repoOwner={repoOwner}
          repoName={repoName}
          data={data}
        />
      );
    };

    const renderError = () => {
      return (
        <div>Problem loading repo. Is it a valid repo? And are you connected to the internet?</div>
      );
    };

    return (
      <Loadable
        promise={Client.getOcto().repos(repoOwner, repoName).fetch()}
        renderLoaded={renderLoaded}
        renderError={renderError}
      />
    );
  }
});

export default RepoKanbanShell;
