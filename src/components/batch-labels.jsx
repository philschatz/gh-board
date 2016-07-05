// Tabs:
// - columns
// - labels
// - milestones

// Panels:
// - Primary Repository
//   - show count of other repos that have that label (& list the repos on hover)
// - Several Repositories (migrate to labels in the primary repository)
//   - show count of other repos that have that label (& list the repos on hover)
// - Only 1 Repository (migrate to labels in the primary repository)

// Stories:
// - batch rename a column
// - batch change color of a column
// - batch reorder columns
// - add/remove a column/label
// - batch "rename" a column to an existing one
//   - if the repo already has a column with the same name then change all Issues to have that label
//   - otherwise, rename&recolor the label

import _ from 'underscore';
import React from 'react';
import * as BS from 'react-bootstrap';

import IssueStore from '../issue-store';
import Database from '../database';
import Client from '../github-client';
import {getFilters} from '../route-utils';

import Loadable from './loadable';
import LabelBadge from './label-badge';

const LabelViewEdit = React.createClass({
  getInitialState() {
    return {isEditing: false, name: null};
  },
  onChangeName() {
    const name = this.refs.labelName.getValue();
    this.setState({name});
  },
  onClickEdit() {
    this.setState({isEditing: true});
  },
  onClickCancel() {
    this.setState({isEditing: false});
  },
  onClickSave() {
    const {repoInfos, label} = this.props;
    const name = this.refs.labelName.getValue();
    let message;
    if (repoInfos.length > 1) {
      message = `Are you sure you want to change this label in ${repoInfos.length} repositories?`;
    } else {
      message = `Are you sure you want to change this label in ${repoInfos[0]}?`;
    }
    if (confirm(message)) {
      Promise.all(repoInfos.map((repoInfo) => {
        return Client.getOcto().repos(repoInfo).labels(label.name).update({name: name});
      }))
      .then(() => {
        alert('Done renaming. To see the updates, go back to the kanban board and then back here (because the developer is lazy)');
        this.setState({isEditing: false});
      })
      .catch((err) => { console.error('Problem Changing label in repos'); console.error(err); alert('There was a problem\n' + err.message); })
    }
  },
  onClickRemove() {
    const {repoInfos, label} = this.props;
    let message;
    if (repoInfos.length > 2) {
      message = `Are you sure you want to remove this label in ${repoInfos.length} repositories?`;
    } else {
      message = `Are you sure you want to remove this label in ${repoInfos[0]}?`;
    }
    if (confirm(message)) {
      Promise.all(repoInfos.map((repoInfo) => {
        return Client.getOcto().repos(repoInfo).labels(label.name).remove();
      }))
      .then(() => {
        alert('Done removing. To see the updates, go back to the kanban board and then back here (because the developer is lazy)');
        this.setState({isRemoved: true});
      })
      .catch((err) => { console.error('Problem Removing label in repos'); console.error(err); alert('There was a problem\n' + err.message); })
    }
  },
  render() {
    const {label, skipPrimaryRepo} = this.props;
    let {repoInfos} = this.props;
    const {isEditing, isRemoved, name} = this.state;

    if (isRemoved) {
      return (<tr/>);
    }

    if (skipPrimaryRepo) {
      repoInfos = repoInfos.slice(1, repoInfos.length);
    }
    if (isEditing) {
      const isSaveEnabled = name && name !== label.name;
      return (
        <tr>
          <td><BS.Input ref='labelName' type='text' onChange={this.onChangeName} defaultValue={name || label.name}/></td>
          <td></td>
          <td>
            <BS.Button bsStyle='default' onClick={this.onClickCancel}>Cancel</BS.Button>
            <BS.Button bsStyle='primary' onClick={this.onClickSave} disabled={!isSaveEnabled}>Save</BS.Button>
          </td>
        </tr>
      )
    } else {
      let details;
      if (repoInfos.length === 0) {
        // only occurs when we skip the primary repo
      } else if (repoInfos.length === 1) {
        const [repoOwner, repoName] = repoInfos[0].split('/');
        details = (
          <a target='_window' href={`https://github.com/${repoOwner}/${repoName}/labels`}>{repoName}</a>
        );
      } else if (repoInfos.length === 2) {
        const [repoOwner, repoName] = repoInfos[0].split('/');
        const [repoOwner2, repoName2] = repoInfos[1].split('/');
        details = (
          <span>
            <a target='_window' href={`https://github.com/${repoOwner}/${repoName}/labels`}>{repoName}</a>
            <span> & </span>
            <a target='_window' href={`https://github.com/${repoOwner2}/${repoName2}/labels`}>{repoName2}</a>
          </span>
        );
      } else {
        const [repoOwner, repoName] = repoInfos[0].split('/');
        const popover = (
          <BS.Popover id={`repos-with-${label.name}`} title='Repositories that have this label'>
            {repoInfos.slice(1).sort().map((repoInfo) => {
              const [repoOwner1, repoName1] = repoInfo.split('/');
              return (
                <p key={repoInfo}>
                  <a target='_window' href={`https://github.com/${repoOwner1}/${repoName1}/labels`}>{repoOwner1}/{repoName1}</a>
                </p>
              )
            })}
          </BS.Popover>
        );
        details = (
          <span className='-repo-and-more'>
            <a target='_window' href={`https://github.com/${repoOwner}/${repoName}/labels`}>{repoName}</a>
            <span> & </span>

            <BS.OverlayTrigger trigger='click' placement='bottom' rootClose overlay={popover}>
              <BS.Button bsStyle='link' bsSize='sm'>
                {repoInfos.length - 1} more...
              </BS.Button>
            </BS.OverlayTrigger>
          </span>
        );
      }

      const constructedLabel = {
        name: name || label.name,
        color: label.color
      };
      return (
        <tr className='batch-label'>
          <td className='-label-badge'>
            <LabelBadge label={constructedLabel} onClick={this.onClickEdit}/>
          </td>
          <td className='-label-repos'><small>{details}</small></td>
          <td className='label-actions'>
            <BS.Button bsStyle='link' onClick={this.onClickEdit}><i className='octicon octicon-pencil'/> Edit</BS.Button>
            {' '}
            <BS.Button className='action-delete' bsStyle='link' onClick={this.onClickRemove}><i className='octicon octicon-trashcan'/></BS.Button>
          </td>
        </tr>
      );
    }
  }
});

const BatchLabelsShell = React.createClass({
  componentDidMount() {
    IssueStore.on('change', this.onChange);
    IssueStore.startPolling();
    IssueStore.fetchIssues(); // TODO: start up the polling in a better way
  },
  componentWillUnmount() {
    IssueStore.off('change', this.onChange);
  },
  onChange() {
    this.setState({});
  },

  renderLabels(labels, skipPrimaryRepo) {
    return _.sortBy(labels, ({name}) => name).map(({label, repoInfos}) => {
      return (
        <LabelViewEdit key={label.name} label={label} repoInfos={repoInfos} skipPrimaryRepo={skipPrimaryRepo}/>
      )
    });
  },
  renderLoaded(repoInfosWithLabels) {
    const {repoOwner: primaryRepoOwner, repoName: primaryRepoName} = repoInfosWithLabels[0];

    const labelCounts = {};
    // keys are the label name, and value can be undefined, or `{repoInfos, label}`
    repoInfosWithLabels.forEach(({repoOwner, repoName, labels}) => {
      (labels || []).forEach((label) => {
        const {name} = label;
        const labelCount = labelCounts[name] || {repoInfos: [], label};
        // if repos are listed explicitly _and_ a `*` is provided there may be duplicates
        if (labelCount.repoInfos.indexOf(`${repoOwner}/${repoName}`) < 0) {
          labelCount.repoInfos.push(`${repoOwner}/${repoName}`);
        }
        labelCounts[name] = labelCount;
      });
    });

    const labelCountsValues = _.sortBy(_.values(labelCounts), ({label}) => label.name);
    const primaryLabels = _.filter(labelCountsValues, ({repoInfos}) => {
      return (repoInfos.indexOf(`${primaryRepoOwner}/${primaryRepoName}`) >= 0)
    });

    const nonPrimaryAndNonUniqueLabels = _.filter(labelCountsValues, ({repoInfos}) => {
      return (repoInfos.indexOf(`${primaryRepoOwner}/${primaryRepoName}`) < 0) && repoInfos.length > 1;
    });

    // const uniqueLabels = _.filter(labelCountsValues, ({repoInfos}) => {
    //   return (repoInfos.indexOf(`${primaryRepoOwner}/${primaryRepoName}`) < 0) && repoInfos.length === 1;
    // });

    // generate a set of unique labels for each repo
    let repoInfosWithUniqueLabels = repoInfosWithLabels.map(({repoOwner, repoName, labels}) => {
      let uniqueLabels = labels.filter((label) => {
        if (!labelCounts[label.name]) {
          throw new Error('BUG! Should have found at least 1 repository in labelCounts');
        } else {
          return (labelCounts[label.name].repoInfos.length === 1);
        }
      });
      // renderLabels requires the following structure:
      // {name, label, repoInfos}
      uniqueLabels = uniqueLabels.map((label) => {
        return {name: label.name, label, repoInfos: [`${repoOwner}/${repoName}`]};
      });
      return {repoOwner, repoName, uniqueLabels};
    });
    // Remove the primary repo and then
    // Remove repos with no unique labels
    repoInfosWithUniqueLabels = repoInfosWithUniqueLabels.filter(({repoOwner, repoName, uniqueLabels}) => {
      if (repoOwner === primaryRepoOwner && repoName === primaryRepoName) {
        return false;
      }
      return uniqueLabels.length > 0;
    });

    let primaryPanel;
    if (primaryLabels.length) {
      primaryPanel = (
        <BS.Col lg={6}>
          <BS.Panel header={`Primary Repository (${primaryRepoOwner}/${primaryRepoName})`}>
            These are labels on the primary repository that may affect other repositories
            <BS.Table responsive hover>
              <tbody>
                {this.renderLabels(primaryLabels, true/*skipPrimaryRepo*/)}
              </tbody>
            </BS.Table>
          </BS.Panel>
        </BS.Col>
      );
    }

    let nonPrimaryAndNonUniquePanel;
    if (nonPrimaryAndNonUniqueLabels.length) {
      nonPrimaryAndNonUniquePanel = (
        <BS.Col lg={6}>
          <BS.Panel header='Labels in more than 1 repository'>
            These are labels in multiple repositories (but not the primary repository)
            <BS.Table responsive hover>
              <tbody>
                {this.renderLabels(nonPrimaryAndNonUniqueLabels)}
              </tbody>
            </BS.Table>
          </BS.Panel>
        </BS.Col>
      );
    }

    const uniquePanels = repoInfosWithUniqueLabels.map(({repoOwner, repoName, uniqueLabels}) => {
      const header = (
        <span>Labels unique to <a target='_window' href={`https://github.com/${repoOwner}/${repoName}/labels`}>{repoOwner}/{repoName}</a></span>
      )
      return (
        <BS.Col lg={6} key={`${repoOwner}/${repoName}`}>
          <BS.Panel header={header}>
            <BS.Table responsive hover fill>
              <tbody>
                {this.renderLabels(uniqueLabels)}
              </tbody>
            </BS.Table>
          </BS.Panel>
        </BS.Col>
      );
    });

    return (
      <BS.Grid>
        <BS.Row>
          {primaryPanel}
          {nonPrimaryAndNonUniquePanel}
          {uniquePanels}
        </BS.Row>
      </BS.Grid>
    );
  },
  render() {
    const {repoInfos} = getFilters().getState();
    const promise = IssueStore.fetchConcreteRepoInfos(repoInfos)
    .then((concreteRepoInfos) => {
      return Promise.all(concreteRepoInfos.map(({repoOwner, repoName}) => {
        return IssueStore.fetchRepoLabels(repoOwner, repoName);
      }));
    });
    return (
      <Loadable
        promise={promise}
        renderLoaded={this.renderLoaded}
      />
    )
  }
});

export default BatchLabelsShell;
