var queryString = require('query-string')
var raw = require('choo/html/raw')
var html = require('choo/html')
var ok = require('object-keys')
var xtend = require('xtend')
var path = require('path')

// components
var ActionBar = require('../components/actionbar')
var Breadcrumbs = require('../components/breadcrumbs')
var Sidebar = require('../components/sidebar')
var Split = require('../components/split')
var Publish = require('../components/publish')

// containers
var Fields = require('../containers/fields')
var blueprintDefault = require('../blueprints/default')

// views
var File = require('./file')
var FilesAll = require('./files-all')
var FileNew = require('./file-new')
var PagesAll = require('./pages-all')
var PageNew = require('./page-new')
var Sites = require('./sites')
var Hub = require('./hub')

// methods
var methodsFile = require('../methods/file')
var methodsPage = require('../methods/page')
var methodsSite = require('../methods/site')

module.exports = wrapper(view)

function view (state, emit) {
  var search = queryString.parse(location.search)
  var draftPage = getDraftPage()
  var blueprint = getBlueprint()

  return html`
    <body class="fs1 ff-sans x xdc vhmn100">
      ${header()}
      ${content()}
      ${loading()}
    </body>
  `

  function header () {
    var editorActive = typeof search.url !== 'undefined'
    var sitesActive = typeof search.sites !== 'undefined'
    var hubActive = typeof search.hub !== 'undefined'

    return html`
      <div id="header" class="x xjb usn z2 psr oxh">
        <div class="x xx bb1-bg10 oxh">
          ${editorActive ? breadcrumbs() : html`<div class="py2 px4">Enoki</div>`}
        </div>
        <div class="x">
          <div class="bl1-bg10 ">
            <a href="/?url=/" class="${editorActive ? 'fc-fg' : 'fc-bg25 fch-fg bb1-bg10'} db p2">Editor</a>
          </div>
          <div class="bl1-bg10">
            <a href="/?sites=all" class="${sitesActive ? 'fc-fg' : 'fc-bg25 fch-fg bb1-bg10'} db p2">Sites</a>
          </div>
          <div class="bl1-bg10 br1-bg10">
            <a href="/?hub=docs" class="${hubActive ? 'fc-fg' : 'fc-bg25 fch-fg bb1-bg10'} db p2">Hub</a>
          </div>
          <div class="bb1-bg10" style="height: 6.1rem; width: 6.1rem"></div>
        </div>
      </div>
    `
  }

  function breadcrumbs () {
    return html`
      <div class="x oxh px3">
        <a href="?url=/" class="bgc-bg db px1 nbb py2 breadcrumb fc-bg25 fch-fg">home</a>
        <div class="oxh xx breadcrumbs wsnw drtl">
          ${Breadcrumbs({ page: state.page })}
        </div>
      </div>
    `
  }

  function loading () {
    if (!state.panel.loading) return
    return html`
      <div class="psf z2 t0 r0">
        <div class="loader"></div>
      </div>
    `
  }

  function sidebar () {
    return Sidebar({
      site: state.site,
      page: state.page,
      content: state.content,
      query: state.query,
      uploadActive: state.ui.dragActive,
      pagesActive: !(blueprint.pages === false),
      filesActive: !(blueprint.files === false),
      handleFiles: handleFilesUpload,
      handleRemovePage: handleRemovePage,
      handleFilesUpload: handleFilesUpload
    }, emit)
  }

  // TODO: clean this up
  function content () {
    if (!state.sites.p2p && state.sites.loaded) {
      // non p2p
      return nonDat(state, emit)
    }

    if (search.sites || !state.sites.active) {
      // sites
      return Sites(state, emit)
    }

    if (search.hub) {
      // docs
      return Hub(state, emit)
    }

    if (search.file === 'new') {
      // files
      return [
        PageHeader(),
        Split(sidebar(), [FileNew(state, emit), Page()])
      ]
    }

    // single file
    if (search.file) return File(state, emit)

    // pages
    if (search.pages === 'all') {
      return [PageHeader(), PagesAll(state, emit)]
    }

    if (search.page === 'new') {
      // create page
      return [
        PageHeader(),
        Split(sidebar(), [PageNew(state, emit), Page()])
      ]
    }

    if (search.files === 'all') {
      // all files
      return [PageHeader(), FilesAll(state, emit)]
    }

    return [
      // default fields
      PageHeader(),
      Split(sidebar(), Page())
    ]
  }

  function Page () {
    return html`
      <div id="content-page" class="x xdc c12" style="padding-bottom: 7rem">
        <div class="x1">
          <div class="x xw">
            ${Fields({
              blueprint: blueprint,
              draft: draftPage,
              page: state.page,
              values: state.page,
              handleFieldUpdate: handleFieldUpdate
            })}
          </div>
          <div class="psf b0 l0 r0 p1 pen z2">
            <div class="c12 pea">
              ${ActionBar({
                disabled: draftPage === undefined || search.page,
                saveLarge: true,
                handleSave: handleSavePage,
                handleCancel: handleCancelPage,
                handleRemove: handleRemovePage
              })}
            </div>
          </div>
        </div>
      </div>
    `
  }

  function PageHeader () {
    return html`
      <div class="px3">
        <div class="x xw py1 xjb">
          <div class="fs2 px1 py2 toe wsnw oxh c12 sm-xx fw500">
            <a href="?url=${state.page.url}">${state.page.title || state.page.name || raw('&nbsp;')}</a>
          </div>
          ${elMeta()}
        </div>
        <div class="px1"><div class="bb1-bg10"></div></div>
      </div>
    `
  }


  function elMeta () {
    return html`
      <div class="x">
        ${state.site.info ? elView() : ''}
        ${state.page.url && state.page.url !== '/' ? elRemove() : ''}
      </div>
    `
  }

  function elView () {
    return html`
      <div class="p1 xx">
        <a
          href="${state.site.info.url}${state.page.url}"
          target="_blank"
          class="tac bgch-fg bgc-bg25 button-medium external"
        >Open</a>
      </div>
    `
  }

  function elRemove () {
    return html`
      <div class="p1 xx">
        <span
          class="tac bgch-fg bgc-bg25 button-medium"
          onclick=${handleRemovePage}
        >Delete</span>
      </div>
    `
  }

  function handleFieldUpdate (event, data) {
    emit(state.events.PANEL_UPDATE, {
      path: state.page.path,
      url: state.page.url,
      data: { [event]: data }
    })
  }

  function handleSavePage () {
    if (!draftPage) return

    emit(state.events.PANEL_SAVE, {
      file: state.page.file,
      path: state.page.path,
      url: state.page.url,
      page: ok(blueprint.fields)
        .reduce(function (result, field) {
          result[field] = draftPage[field] === undefined
            ? state.page[field]
            : draftPage[field]
          return result
        }, { })
    })
  }

  function handleCancelPage () {
    emit(state.events.PANEL_CANCEL, {
      url: state.page.url
    })
  }

  function handleRemovePage () {
    emit(state.events.PANEL_REMOVE, {
      confirm: true,
      title: state.page.title,
      path: state.page.path,
      url: state.page.url
    })
  }

  function handleFilesUpload (event, data) {
    emit(state.events.PANEL_FILES_ADD, {
      path: state.page.path,
      url: state.page.url,
      files: data.files
    })
  }

  function getBlueprint () {
    if (!state.page || !state.site.loaded) {
      return { }
    } else {
      return (
        state.site.blueprints[state.page.view] ||
        state.site.blueprints.default ||
        blueprintDefault
      )
    }
  }

  function getDraftPage () {
    return state.panel && state.page && state.panel.changes[state.page.url]
  }
}

function nonDat (state, emit) {
  return html`
    <div class="xx c12 x xac">
      <div class="c12 p1 x xw xjc">
        <div class="p1 pb3 fs2 lh1-25 tac c12">
          Please open Enoki in Beaker, an<br class="dn sm-dib"> experimental peer-to-peer browser
        </div>
        <div class="x xjc c12">
          <div class="p1">
            <a href="https://beakerbrowser.com" target="_blank" class="button-large bgc-fg">
              Download Beaker Browser
            </a>
          </div>
        </div>
        <div class="p1 py3 tac fc-bg25 lh1-5 c12" style="max-width: 55rem">
          Want to edit your site offline? Navigate to the dat:// url and “Add to Library”, or customize to your liking by forking.
        </div>
        <div class="x xjc c12">
          <div class="p1">
            <a href="dat://panel.enoki.site" class="button-medium bgc-bg25 bgch-fg fc-bg">Open dat:// in Beaker Browser</a>
          </div>
        </div>
        <div class="p1 py3 tac fc-bg25 c12">
          Thanks for your patience; this flow will be improving soon :)
        </div>
      </div>
    </div>
  `
}

function wrapper (view) {
  return function (state, emit) {
    var href = state.query.url || '/'
    var page = state.content[href] || { }
    return view(xtend(state, { page: page }), emit)
  }
}
