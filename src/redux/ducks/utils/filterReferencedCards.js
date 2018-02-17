export default function filterReferencedCards(cards, isFilteringPullRequests) {
  const allPossiblyRelatedCards = {}
  cards.forEach(card => {
    // XOR
    if (
      isFilteringPullRequests ? !card.isPullRequest() : card.isPullRequest()
    ) {
      allPossiblyRelatedCards[card.key()] = true
    }
  })
  return cards.filter(card => {
    // XOR
    if (
      isFilteringPullRequests ? card.isPullRequest() : !card.isPullRequest()
    ) {
      // loop through all the related PR's. If one matches, remove this issue
      let related = []
      if (isFilteringPullRequests && card.isPullRequest()) {
        related = card.getRelated().filter(({ vertex }) => {
          return !vertex.isPullRequest()
        })
      } else if (!isFilteringPullRequests && !card.isPullRequest()) {
        related = card.getRelated().filter(({ vertex }) => {
          return vertex.isPullRequest()
        })
      }
      const hasVisiblePullRequest = related.filter(({ vertex: otherCard }) => {
        if (allPossiblyRelatedCards[otherCard.key()]) {
          return true
        }
        return false
      })
      return !hasVisiblePullRequest.length
    } else {
      return true
    }
  })
}
