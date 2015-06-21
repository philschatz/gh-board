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
    // Wrap images with a link that opens them in a new tab
    const images = this.getDOMNode().querySelectorAll('img');
    _.each(images, (img) => {
      const parent = img.parentNode;
      const href = img.getAttribute('src');
      const link = document.createElement('a');
      parent.replaceChild(link, img);
      link.appendChild(img);
      link.setAttribute('href', href);
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

    if (html) {
      return (
        <div className='rendered-markdown' dangerouslySetInnerHTML={{__html: html}} />
      );
    } else {
      return (
        <div className='rendered-markdown is-empty'></div>
      );
    }

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
