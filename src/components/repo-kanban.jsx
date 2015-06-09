import React from 'react';
import _ from 'underscore';

import Client from '../github-client';
import Loadable from './loadable.jsx';
import IssueList from './issue-list.jsx';

// Of the form `# - ...`
const KANBAN_LABEL = /^\d+\ -\ /;

const filterKanbanLabels = (labels) => {
  const kanbanLabels = _.filter(labels, (label) => KANBAN_LABEL.test(label.name));
  // TODO: Handle more than 10 workflow states
  return kanbanLabels.sort();
};

const kanbanLabelName = (label) => label.name.slice(label.name.indexOf('-') + 2);


const KanbanRepo = React.createClass({
  displayName: 'KanbanRepo',
  renderHeadings(labels) {
    return _.map(labels, (label) => {
      const name = kanbanLabelName(label);
      return (
        <th>{name}</th>
      );
    });
  },
  renderIssues(labels) {
    const {repoOwner, repoName} = this.props;

    return _.map(labels, (label) => {
      return (
        <td>
          <Loadable
            promise={Client.getOcto().repos(repoOwner, repoName).issues.fetch({labels: label.name})}
            renderLoaded={(issues) => <IssueList issues={issues} repoOwner={repoOwner} repoName={repoName} label={label}/>}
          />
        </td>
      );
    });
  },
  render() {
    const {labels} = this.props;
    const kanbanLabels = filterKanbanLabels(labels);

    const workflowStateHeadings = this.renderHeadings(kanbanLabels);
    const workflowStateIssues = this.renderIssues(kanbanLabels);

    return (
      <table className='kanban-board'>
        <thead>
          {workflowStateHeadings}
        </thead>
        <tbody>
          <tr>
            {workflowStateIssues}
          </tr>
        </tbody>
      </table>
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

      if (kanbanLabels.length > 1) {
        return (
          <KanbanRepo
            repoOwner={repoOwner}
            repoName={repoName}
            labels={labels}
            data={data}
          />
        );
      } else {
        return (
          <div>Not a valid kanban repo! Would you like to initialize it?</div>
        );
      }
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
