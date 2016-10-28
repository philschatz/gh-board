import {hashHistory} from 'react-router';

// Use hashHistory because there is a <MenuItem> in <App> that explicitly tacks on a "#"
// Also, gh-pages does not allow arbitrary URLs
export default hashHistory;
