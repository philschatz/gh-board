import App from './components/app';
import NotFoundShell from './components/views/not-found';
import Dashboard from './components/views/dashboard';
import RepoKanban from './components/views/kanban';
import ByMilestoneView from './components/views/by-milestone';
import ByUserView from './components/views/by-user';

export default [
  { path: '/',
    component: App,
    indexRoute: { component: Dashboard },
    childRoutes: [
      { path: '/r/:repoStr',
        indexRoute: {component: RepoKanban},
        // If you change these children (or the parents) make sure you edit RELEVANT_PATH_SEGMENT in another file.
        childRoutes: [
          { path: 'kanban', component: RepoKanban},
          { path: 'by-milestone', component: ByMilestoneView },
          { path: 'by-user', component: ByUserView },
          { path: 'gantt',
            // Keep the review page as a separate chunk because it contains d3
            getComponent(location, callback) {
              require.ensure([], (require) => {
                // Remember to add the `.default`!
                callback(null, require('./components/views/gantt').default);
              });
            }
          },
          { path: 'burnup',
            // Keep the review page as a separate chunk because it contains d3
            getComponent(location, callback) {
              require.ensure([], (require) => {
                // Remember to add the `.default`!
                callback(null, require('./components/views/burnup').default);
              });
            }
          }
        ] },
      // Catch for people blindly replacing "https://github.com/..." with "gh-board/#..."
      { path: '/:repoOwner/:repoName', onEnter: ({params}, replace) => replace(null, `/r/${params.repoOwner}:${params.repoName}`) },
      { path: '/**', component: NotFoundShell },
    ],
  }
];
