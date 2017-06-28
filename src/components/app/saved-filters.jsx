import React from 'react';
import * as BS from 'react-bootstrap';
import {TagIcon} from 'react-octicons';

const LOCALSTORAGE_KEY = 'saved-filters';

const AddFilterModal = React.createClass({
  onSave() {
    const {onHide} = this.props;
    const data = JSON.parse(window.localStorage[LOCALSTORAGE_KEY] || '[]');
    const title = this._title.value;
    data.push({title: title, hashStr: window.location.hash});
    window.localStorage[LOCALSTORAGE_KEY] = JSON.stringify(data);
    onHide();
  },
  render() {
    return (
      <BS.Modal className='-add-filter-modal' {...this.props}>
        <BS.Modal.Header closeButton>
          <BS.Modal.Title><TagIcon size='mega'/> Save Filter</BS.Modal.Title>
        </BS.Modal.Header>
        <BS.Modal.Body>
          <BS.FormControl type='text' inputRef={r => this._title = r}/>
        </BS.Modal.Body>
        <BS.Modal.Footer>
          <BS.Button bsStyle='primary' onClick={this.onSave}>Save</BS.Button>
        </BS.Modal.Footer>
      </BS.Modal>
    );
  }
});

const SavedFiltersButton = React.createClass({
  getInitialState() {
    return {showModal: false};
  },
  showAddFilter() {
    this.setState({showModal: true});
  },
  hideAddFilter() {
    this.setState({showModal: false});
  },
  render() {
    const {showModal} = this.state;
    const savedFilterData = JSON.parse(window.localStorage['saved-filters'] || '[]');

    const filters = savedFilterData.map(({title, hashStr}) => {
      return (
        <BS.MenuItem key={hashStr} href={hashStr}>{title}</BS.MenuItem>
      );
    });
    const addFilter = (
      <TagIcon title='Save Filter' onClick={this.showAddFilter}/>
    );
    return (
      <li className='-saved-filters'>
        <BS.SplitButton id='saved-filters' title={addFilter}>
          <BS.MenuItem header>Apply Saved Filter</BS.MenuItem>
          {filters}
        </BS.SplitButton>
        <AddFilterModal show={showModal} onHide={this.hideAddFilter}/>
      </li>
    );
  }
});

export default SavedFiltersButton;
