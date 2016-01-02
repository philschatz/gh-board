import _ from 'underscore';

class BipartiteGraph {
  constructor() {
    this.edgesA = {};
    // NEW FEATURE: Show **all** related Issues/PR's (the graph is no longer bipartite)
    // TODO: Refactor to simplify this datastructure
    this.edgesB = this.edgesA; // = {};
  }
  cardToKey(card) {
    return card.repoOwner + '/' + card.repoName + '#' + card.issue.number;
  }
  addEdge(a, b, aObj, bObj, edgeValue) {
    if (!this.edgesA[a]) { this.edgesA[a] = {}; }
    if (!this.edgesB[b]) { this.edgesB[b] = {}; }

    this.edgesA[a][b] = {vertex: bObj, edgeValue};
    this.edgesB[b][a] = {vertex: aObj, edgeValue};
  }
  // removeEdge(a, b) {
  //   delete this.edgesA[a][b];
  //   delete this.edgesB[b][a];
  // }
  // removeA(a) {
  //   // Find all the B's so we can remove each edge
  //   _.each(this.edgesA[a], (b) => {
  //     this.removeEdge(a, b);
  //   });
  //   delete this.edgesA[a];
  // }
  // removeB(b) {
  //   _.each(this.edgesB[b], (a) => {
  //     this.removeEdge(a, b);
  //   });
  //   delete this.edgesB[b];
  // }
  getA(a) {
    return _.values(this.edgesA[a]);
  }
  getB(b) {
    return _.values(this.edgesB[b]);
  }
}


export default BipartiteGraph;
