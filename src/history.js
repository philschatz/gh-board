import createHashHistory from 'history/lib/createHashHistory';

// Use hashHistory because there is a <MenuItem> in <App> that explicitly tacks on a "#"
export default createHashHistory({queryKey: false});
