import React from 'react';
import _ from 'underscore';
import BS from 'react-bootstrap';

import {contains, KANBAN_LABEL, ICEBOX_NAME} from '../helpers';
import {Store} from '../issue-store';
import {FilterStore} from '../filter-store';
import Client from '../github-client';
import Loadable from './loadable.jsx';
import IssueList from './issue-list.jsx';


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
      <td key={label.name}>
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
  onAddCardList() {
    const {onLabelsChanged} = this.props;
    const {labels} = this.props;
    const {repoOwner, repoName} = this.props;

    const kanbanLabels = filterKanbanLabels(labels);

    let lastId = '-1';

    const lastLabel = kanbanLabels[kanbanLabels.length - 1];
    if (lastLabel.name === ICEBOX_NAME) {
      lastId = '-1';
    } else {
      lastId = lastLabel.name.match(/^\d+/)[0];
    }
    const newId = parseInt(lastId) + 1;

    const labelName = prompt('Name of new CardList');
    if (labelName) {
      const name = newId + ' - ' + labelName;
      const color = 'cccccc';

      // Add the label and re-render
      Store.createLabel(repoOwner, repoName, {name, color})
      .then(() => {
        // Shortcut: Add the label to the list locally w/o refetching
        onLabelsChanged();
      });
    }
  },
  renderBoard(allIssues) {
    const {labels} = this.props;
    const kanbanLabels = filterKanbanLabels(labels);

    const workflowStateIssues = this.renderColumns(kanbanLabels, allIssues);

    const addCardList = (
      <td key='add-cardlist'>
        <BS.Button
          alt='Add a new Cardlist to Board'
          onClick={this.onAddCardList}>+</BS.Button>
      </td>
    );

    return (
      <table className='kanban-board'>
        <tbody>
          <tr>
            {workflowStateIssues}
            {addCardList}
          </tr>
        </tbody>
      </table>
    );
  },
  render() {
    const {repoOwner, repoName} = this.props;
    const promise = Store.fetchAll(repoOwner, repoName);
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
  componentDidMount() {
    Store.on('change', this.onChange);
  },
  componentDidUnmount() {
    Store.off('change', this.onChange);
  },
  onChange() {
    this.setState({});
  },
  onLabelsChanged() {
    this.setState({});
  },
  render() {
    const {repoOwner, repoName, data} = this.props;

    // Get all the issue labels first
    const renderLoaded = (labels) => {
      // If there are at least 2 'special' kanban labels then consider it valid
      // const kanbanLabels = filterKanbanLabels(labels);
      // const isValidKanbanRepo = kanbanLabels.length > 1;
      let allLabels;
      if (FilterStore.getShowIcebox()) {
        const icebox = [{name: ICEBOX_NAME}];
        allLabels = icebox.concat(labels);
      } else {
        allLabels = labels;
      }

      return (
        <KanbanRepo
          repoOwner={repoOwner}
          repoName={repoName}
          labels={allLabels}
          data={data}
          onLabelsChanged={this.onLabelsChanged}
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
