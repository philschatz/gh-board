import React from 'react';
import {connect} from 'react-redux';
import * as BS from 'react-bootstrap';
import {GearIcon} from 'react-octicons';

let hasAlreadyShownAnonymousModal = false;

const AnonymousModal = React.createClass({
  render() {
    const onHide = () => {
      hasAlreadyShownAnonymousModal = true;
      this.setState({ showModal: false});
    };
    let showModal;
    if (this.props.token) {
      showModal = false;
    } else {
      showModal = !hasAlreadyShownAnonymousModal;
    }

    return (
      <BS.Modal show={showModal} container={this} onHide={onHide}>
        <BS.Modal.Header closeButton>Viewing a Board Anonymously</BS.Modal.Header>
        <BS.Modal.Body className='anonymous-instructions-body'>
          <p>You are currently <strong>not signed in</strong>. GitHub's API only allows <em>60</em> requests per hour for non-authenticated users.</p>
          <p>Showing additional information for Pull Requests requires making a separate API call for each and can end up depleting the 60 requests quickly.</p>

          <p>The following information is <strong>disabled initially</strong>:</p>
          <ul>
            <li>Status information from services like Travis-CI and Jenkins</li>
            <li>Merge conflict information</li>
            <li>More than 100 issues on the board</li>
          </ul>
          <p>You can enable it by clicking the <BS.Button disabled bsSize='xs'><GearIcon/>{' '}<span className='caret'/></BS.Button> on the top-right corner next to <BS.Button disabled bsStyle='success' bsSize='xs'>Sign In</BS.Button> and selecting "Show More Pull Request Info" or by clicking the <BS.Button disabled bsStyle='success' bsSize='xs'>Sign In</BS.Button>.</p>
        </BS.Modal.Body>
        <BS.Modal.Footer className='anonymous-instructions-footer'>
          <BS.Button bsStyle='primary' onClick={onHide}>Ok, I'll find it if I need it</BS.Button>
        </BS.Modal.Footer>
      </BS.Modal>
    );
  }
});

export default connect(state => state.user)(AnonymousModal);
