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
import {getFilters} from '../route-utils';

import Loadable from './loadable';
import LabelBadge from './label-badge';

const LabelViewEdit = React.createClass({
  getInitialState() {
    return {isEditing: false};
  },
  onClickEdit() {
    this.setState({isEditing: true});
  },
  onClickCancel() {
    this.setState({isEditing: false});
  },
  render() {
    const {label, repoInfos} = this.props;
    const {isEditing} = this.state;
    if (isEditing) {
      return (
        <tr>
          <td><BS.Input ref='labelName' type='text' defaultValue={label.name}/></td>
          <td>color?</td>
          <td>
            <BS.Button bsStyle='default' onClick={this.onClickCancel}>Cancel</BS.Button>
            <BS.Button bsStyle='primary' disabled>Save</BS.Button>
          </td>
        </tr>
      )
    } else {
      return (
        <tr>
          <td>
            <LabelBadge label={label} onClick={this.onClickEdit}/>
          </td>
          <td>{repoInfos.length === 1 ? repoInfos[0] : repoInfos.length}</td>
          <td><BS.Button bsStyle='link' onClick={this.onClickEdit}><i className='octicon octicon-pencil'/> Edit</BS.Button></td>
        </tr>
      );
    }
  }
});

const BatchLabelsShell = React.createClass({
  renderLabels(labels) {
    return _.sortBy(labels, ({name}) => name).map(({label, repoInfos}) => {
      return (
        <LabelViewEdit key={label.name} label={label} repoInfos={repoInfos}/>
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
        labelCount.repoInfos.push(`${repoOwner}/${repoName}`);
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

    const uniqueLabels = _.filter(labelCountsValues, ({repoInfos}) => {
      return (repoInfos.indexOf(`${primaryRepoOwner}/${primaryRepoName}`) < 0) && repoInfos.length === 1;
    });



    return (
      <BS.Grid>
        <BS.Row>
          <BS.Col md={6}>
            <BS.Panel header='Primary Repository'>
              These are labels on the primary repository that may affect other repositories
              <BS.Table responsive hover>
                <tbody>
                  {this.renderLabels(primaryLabels)}
                </tbody>
              </BS.Table>
            </BS.Panel>
          </BS.Col>
          <BS.Col md={6}>
            <BS.Panel header='Labels in more than 1 repository'>
              These are labels in multiple repositories (but not the primary repository)
              <BS.Table responsive hover>
                <tbody>
                  {this.renderLabels(nonPrimaryAndNonUniqueLabels)}
                </tbody>
              </BS.Table>
            </BS.Panel>
          </BS.Col>
          <BS.Col md={6}>
            <BS.Panel header='Labels unique to 1 repository'>
              These are labels that are unique to 1 repository (but not in the primary repository)
              <BS.Table responsive hover>
                <tbody>
                  {this.renderLabels(uniqueLabels)}
                </tbody>
              </BS.Table>
            </BS.Panel>
          </BS.Col>
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
