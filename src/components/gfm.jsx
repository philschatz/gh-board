import React from 'react';
import _ from 'underscore';
import ultramarked from 'ultramarked';
import linkify from 'gfm-linkify';

// import Client from '../github-client';
// import Loadable from './loadable.jsx';

const InnerMarkdown = React.createClass({
  displayName: 'InnerMarkdown',
  updateLinks() {
    const links = this.getDOMNode().querySelectorAll('a');
    _.each(links, (link) => {
      link.setAttribute('target', '_blank');
    });
  },
  componentDidMount() {
    this.updateLinks();
  },
  componentDidUpdate() {
    this.updateLinks();
  },
  render() {
    const {text, repoOwner, repoName} = this.props;
    const context = repoOwner + '/' + repoName;
    const textStripped = text.replace(/<!--[\s\S]*?-->/g, '');
    const html = ultramarked(linkify(textStripped, context));

    return (
      <div className='rendered-markdown' dangerouslySetInnerHTML={{__html: html}} />
    );
  }

});

export default InnerMarkdown;

// export default React.createClass({
//   displayName: 'GithubFlavoredMarkdown',
//   getPromise() {
//     const {text, repoOwner, repoName} = this.props;
//     const context = repoOwner + '/' + repoName;
//     const isRaw = true;
//     const HACK = JSON.stringify({text: text, context: context, mode: 'gfm'});
//     return Client.getOcto().markdown.create(HACK, isRaw);
//   },
//   render() {
//     return (
//       <Loadable
//         promise={this.getPromise()}
//         renderLoaded={(html) => {
//           return (
//             <InnerMarkdown html={html} />
//           );
//         }}
//       />
//     );
//   }
// });
