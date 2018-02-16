import _ from 'underscore'

class BipartiteGraph {
  constructor() {
    this.edgesA = {}
    // NEW FEATURE: Show **all** related Issues/PR's (the graph is no longer bipartite)
    // TODO: Refactor to simplify this datastructure
    this.edgesB = this.edgesA // = {};
  }
  cardToKey(card) {
    return card.repoOwner + '/' + card.repoName + '#' + card.number
  }
  addCards(cards, getCard) {
    _.each(cards, card => {
      card = getCard(card, true)
      const cardPath = this.cardToKey(card)
      if (card.issue) {
        // If an issue refers to some random repo then card.issue might be null
        const relatedIssues = card.getRelatedIssuesFromBody()
        // Show **all** related Issues/PR's (the graph is no longer bipartite)
        _.each(relatedIssues, ({ repoOwner, repoName, number, fixes }) => {
          const otherCardPath = this.cardToKey({
            repoOwner,
            repoName,
            issue: { number },
          })
          const otherCard = getCard({ repoOwner, repoName, number })
          if (otherCard) {
            this.addEdge(otherCardPath, cardPath, otherCard, card, fixes)
          }
        })
      }
    })
    return this
  }
  addEdge(a, b, aObj, bObj, edgeValue) {
    if (!this.edgesA[a]) {
      this.edgesA[a] = {}
    }
    if (!this.edgesB[b]) {
      this.edgesB[b] = {}
    }

    this.edgesA[a][b] = { vertex: bObj, edgeValue }
    this.edgesB[b][a] = { vertex: aObj, edgeValue }
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
    return _.values(this.edgesA[a])
  }
  getB(b) {
    return _.values(this.edgesB[b])
  }
}

export default BipartiteGraph
