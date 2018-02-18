var html = require('choo/html')

var Header = require('../components/header')
var designOptions = require('../design/options')

module.exports = wrapper

function wrapper (view) {
  return function (state, emit) {

    // extend state
    var href = state.href.replace('/hub/', '')
    state.page = state.docs.content['/' + href] || { }

    return [
      Header(state, emit),
      renderNavigation(state, emit),
      renderContent() 
    ]

    function renderContent () {
      // async load content
      if (!state.docs.loaded) {
        emit(state.events.DOCS_LOAD)
        return
      }
      return view(state, emit)
    }
  }
}

function renderNavigation (state, emit) {
  var hrefActive = state.href.replace('/hub/', '')
  var links = ['guides', 'docs', 'log']
  var highlight = state.page.background || designOptions.colors.fg

  return html`
    <div class="px2" style="--highlight: ${highlight}">
      <div class="x xjb oh">
        <div class="x py1 fs2 fwb">
          ${links.map(renderLink)}
        </div>
        <div class="px2 py2">
          <input type="text" class="input px1-5" placeholder="Search" onfocus=${handleFocus} />
        </div>
      </div>
    </div>
  `

  function renderLink (href) {
    var hrefPage = state.docs.content['/' + href] || { }
    var active = hrefActive.indexOf(href) >= 0
    var colorClass = active ? '' : 'fc-bg25 fch-fg'
    return html`
      <div class="p2 nav-link ${active ? 'nav-active' : ''} dark">
        <a href="/#hub/${href}" class="${colorClass} tfcm">${hrefPage.title}</a>
      </div>
    `
  }
}

function handleFocus (event) {
  event.target.value = 'Coming soon'
}
