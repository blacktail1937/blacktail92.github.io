/**
 * Pandora Theme — Main JavaScript
 * Handles: dark mode, search, progress bar, back to top, mobile menu, TOC
 */

(function () {
  'use strict';

  // ─── DOM refs ──────────────────────────────────────────────
  const $ = (sel, ctx) => (ctx || document).querySelector(sel)
  const $$ = (sel, ctx) => [...(ctx || document).querySelectorAll(sel)]

  const html = document.documentElement
  const themeToggle = $('#themeToggle')
  const mobileThemeToggle = $('#mobileThemeToggle')
  const themeIcon = $('#themeIcon')
  const mobileThemeIcon = $('#mobileThemeIcon')
  const searchToggle = $('#searchToggle')
  const mobileSearchToggle = $('#mobileSearchToggle')
  const searchModal = $('#searchModal')
  const searchInput = $('#searchInput')
  const searchResults = $('#searchResults')
  const searchClose = $('#searchClose')
  const noResults = $('#noResults')
  const progressBar = $('#progressBar')
  const backToTop = $('#backToTop')
  const mobileMenuBtn = $('#mobileMenuBtn')
  const mobileMenu = $('#mobileMenu')

  // ─── Theme Toggle ─────────────────────────────────────────
  const STORAGE_KEY = 'maple-theme'

  function getStoredTheme() {
    return localStorage.getItem(STORAGE_KEY)
  }

  function setTheme(dark) {
    const isDark = dark === true || dark === 'dark'
    html.setAttribute('data-theme', isDark ? 'dark' : 'light')
    const icon = isDark ? '☀️' : '🌙'
    if (themeIcon) themeIcon.textContent = icon
    if (mobileThemeIcon) mobileThemeIcon.textContent = icon
    localStorage.setItem(STORAGE_KEY, isDark ? 'dark' : 'light')

    // Update theme-color meta
    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta) {
      meta.setAttribute('content', meta.getAttribute(isDark ? 'data-dark' : 'data-light'))
    }
  }

  function toggleTheme() {
    const isDark = html.getAttribute('data-theme') === 'dark'
    setTheme(!isDark)
  }

  // Init theme
  const stored = getStoredTheme()
  if (stored === 'dark') {
    setTheme(true)
  } else if (stored === 'light') {
    setTheme(false)
  } else {
    // Default to light
    setTheme(false)
  }

  // Bind theme toggles
  if (themeToggle) themeToggle.addEventListener('click', toggleTheme)
  if (mobileThemeToggle) mobileThemeToggle.addEventListener('click', toggleTheme)

  // ─── Mobile Menu ──────────────────────────────────────────
  if (mobileMenuBtn && mobileMenu) {
    mobileMenuBtn.addEventListener('click', function () {
      mobileMenu.classList.toggle('hidden')
    })
  }

  // ─── Search ───────────────────────────────────────────────
  let fuse = null
  let searchIndex = null

  async function loadSearchIndex() {
    if (fuse) return
    try {
      const resp = await fetch('/index.json')
      searchIndex = await resp.json()
      fuse = new Fuse(searchIndex, {
        keys: [
          { name: 'title', weight: 0.5 },
          { name: 'tags', weight: 0.3 },
          { name: 'content', weight: 0.2 }
        ],
        threshold: 0.4,
        includeScore: true,
        minMatchCharLength: 1
      })
    } catch (e) {
      console.warn('Search index not available:', e.message)
    }
  }

  function doSearch(query) {
    if (!fuse || !query.trim()) {
      const items = searchResults.querySelectorAll('.search-result-item')
      items.forEach(el => el.remove())
      noResults.style.display = 'none'
      return
    }

    const results = fuse.search(query.trim()).slice(0, 20)
    const items = searchResults.querySelectorAll('.search-result-item')
    items.forEach(el => el.remove())

    if (results.length === 0) {
      noResults.style.display = 'block'
      return
    }

    noResults.style.display = 'none'

    results.forEach(r => {
      const item = r.item
      const div = document.createElement('a')
      div.className = 'search-result-item'
      div.href = item.permalink

      // Highlight matched terms
      const title = highlightMatch(item.title, query)
      const excerpt = highlightMatch(
        item.content ? item.content.substring(0, 150) : '',
        query
      )

      div.innerHTML = `
        <div class="search-result-title">${title}</div>
        <div class="search-result-excerpt">${excerpt}${item.content && item.content.length > 150 ? '…' : ''}</div>
        <div class="search-result-meta">${item.date || ''}${item.tags && item.tags.length ? ' · ' + item.tags.join(', ') : ''}</div>
      `
      searchResults.appendChild(div)
    })
  }

  function highlightMatch(text, query) {
    if (!text) return ''
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const regex = new RegExp(`(${escaped})`, 'gi')
    return text.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(regex, '<mark style="background:rgba(73,177,245,0.25);color:inherit;padding:0 0.1em;border-radius:2px">$1</mark>')
  }

  function openSearch() {
    if (searchModal) {
      searchModal.classList.add('active')
      loadSearchIndex()
      setTimeout(() => {
        if (searchInput) searchInput.focus()
      }, 100)
    }
  }

  function closeSearch() {
    if (searchModal) searchModal.classList.remove('active')
    if (searchInput) searchInput.value = ''
    doSearch('')
  }

  // Bind search
  if (searchToggle) searchToggle.addEventListener('click', openSearch)
  if (mobileSearchToggle) mobileSearchToggle.addEventListener('click', function () {
    if (mobileMenu) mobileMenu.classList.add('hidden')
    openSearch()
  })
  if (searchClose) searchClose.addEventListener('click', closeSearch)

  // Keyboard shortcut: Ctrl+K
  document.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault()
      if (searchModal && searchModal.classList.contains('active')) {
        closeSearch()
      } else {
        openSearch()
      }
    }
    // Escape to close search
    if (e.key === 'Escape' && searchModal && searchModal.classList.contains('active')) {
      closeSearch()
    }
  })

  // Click outside to close search
  if (searchModal) {
    searchModal.addEventListener('click', function (e) {
      if (e.target === searchModal) closeSearch()
    })
  }

  // Search input handler
  if (searchInput) {
    let searchTimer
    searchInput.addEventListener('input', function () {
      clearTimeout(searchTimer)
      searchTimer = setTimeout(function () {
        doSearch(searchInput.value)
      }, 200)
    })
  }

  // ─── Reading Progress Bar ──────────────────────────────────
  function updateProgress() {
    if (!progressBar) return
    const scrollTop = window.scrollY
    const docHeight = document.documentElement.scrollHeight - window.innerHeight
    if (docHeight <= 0) {
      progressBar.style.width = '0%'
      return
    }
    const progress = Math.min((scrollTop / docHeight) * 100, 100)
    progressBar.style.width = progress + '%'
  }

  window.addEventListener('scroll', updateProgress, { passive: true })

  // ─── Back to Top ───────────────────────────────────────────
  function checkBackToTop() {
    if (!backToTop) return
    if (window.scrollY > 400) {
      backToTop.classList.add('visible')
    } else {
      backToTop.classList.remove('visible')
    }
  }

  window.addEventListener('scroll', checkBackToTop, { passive: true })

  if (backToTop) {
    backToTop.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    })
  }

  // ─── TOC Active Link ───────────────────────────────────────
  function updateTOCActive() {
    const tocLinks = $$('.toc-wrap nav a')
    if (tocLinks.length === 0) return

    const headings = tocLinks.map(link => {
      const href = link.getAttribute('href')
      if (!href || !href.startsWith('#')) return null
      return document.getElementById(href.substring(1))
    }).filter(Boolean)

    let currentActive = null
    const scrollPos = window.scrollY + 100

    for (let i = 0; i < headings.length; i++) {
      const h = headings[i]
      if (!h) continue
      if (h.offsetTop <= scrollPos) {
        currentActive = tocLinks[i]
      }
    }

    tocLinks.forEach(link => link.classList.remove('active'))
    if (currentActive) currentActive.classList.add('active')
  }

  window.addEventListener('scroll', updateTOCActive, { passive: true })
  window.addEventListener('load', updateTOCActive)

  // ─── Code Block: Copy + Fullscreen ──────────────────────────
  function enhanceCodeBlocks() {
    const pres = $$('.post-content pre')
    pres.forEach(pre => {
      // Skip if already enhanced
      if (pre.dataset.enhanced) return
      pre.dataset.enhanced = 'true'
      pre.style.position = 'relative'

      const toolbar = document.createElement('div')
      toolbar.className = 'code-toolbar'
      toolbar.style.cssText = 'position:absolute;top:0;right:0;display:flex;gap:4px;padding:6px;opacity:0;transition:opacity 0.2s;z-index:2'

      const copyBtn = document.createElement('button')
      copyBtn.innerHTML = '📋'
      copyBtn.title = '复制代码'
      copyBtn.style.cssText = 'background:rgba(255,255,255,0.15);border:none;border-radius:4px;padding:3px 7px;cursor:pointer;font-size:13px;color:#cdd6f4;line-height:1'
      copyBtn.addEventListener('click', function (e) {
        e.stopPropagation()
        const code = pre.querySelector('code') || pre
        const text = code.textContent
        navigator.clipboard.writeText(text).then(function () {
          copyBtn.innerHTML = '✅'
          setTimeout(function () { copyBtn.innerHTML = '📋' }, 1500)
        })
      })

      const fsBtn = document.createElement('button')
      fsBtn.innerHTML = '⛶'
      fsBtn.title = '展开代码'
      fsBtn.style.cssText = 'background:rgba(255,255,255,0.15);border:none;border-radius:4px;padding:3px 7px;cursor:pointer;font-size:13px;color:#cdd6f4;line-height:1'
      fsBtn.addEventListener('click', function (e) {
        e.stopPropagation()
        if (pre.classList.contains('code-expanded')) {
          pre.classList.remove('code-expanded')
          pre.style.position = 'relative'
          pre.style.top = ''
          pre.style.left = ''
          pre.style.width = ''
          pre.style.height = ''
          pre.style.maxHeight = ''
          pre.style.zIndex = ''
          pre.style.margin = ''
          pre.style.borderRadius = ''
          pre.style.overflow = ''
          pre.style.padding = ''
          fsBtn.innerHTML = '⛶'
          fsBtn.title = '展开代码'
        } else {
          pre.classList.add('code-expanded')
          pre.style.position = 'fixed'
          pre.style.top = '0'
          pre.style.left = '0'
          pre.style.width = '100vw'
          pre.style.height = '100vh'
          pre.style.maxHeight = '100vh'
          pre.style.zIndex = '150'
          pre.style.margin = '0'
          pre.style.borderRadius = '0'
          pre.style.overflow = 'auto'
          pre.style.padding = '2rem'
          fsBtn.innerHTML = '✕'
          fsBtn.title = '收起'
        }
      })

      // Word wrap toggle
      const wrapBtn = document.createElement('button')
      wrapBtn.innerHTML = '↩'
      wrapBtn.title = '自动换行'
      wrapBtn.style.cssText = 'background:rgba(255,255,255,0.15);border:none;border-radius:4px;padding:3px 7px;cursor:pointer;font-size:13px;color:#cdd6f4;line-height:1'
      wrapBtn.addEventListener('click', function (e) {
        e.stopPropagation()
        const code = pre.querySelector('code')
        if (!code) return
        if (code.style.whiteSpace === 'pre-wrap') {
          code.style.whiteSpace = 'pre'
          wrapBtn.style.opacity = '0.6'
        } else {
          code.style.whiteSpace = 'pre-wrap'
          code.style.wordBreak = 'break-all'
          wrapBtn.style.opacity = '1'
        }
      })
      wrapBtn.style.opacity = '0.6'

      toolbar.appendChild(copyBtn)
      toolbar.appendChild(fsBtn)
      toolbar.appendChild(wrapBtn)
      pre.appendChild(toolbar)

      pre.addEventListener('mouseenter', function () { toolbar.style.opacity = '1' })
      pre.addEventListener('mouseleave', function () { toolbar.style.opacity = '0' })
    })

    // Close expanded code block on Escape
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        $$('.post-content pre.code-expanded').forEach(function (el) {
          el.classList.remove('code-expanded')
          el.style.position = 'relative'
          el.style.top = ''
          el.style.left = ''
          el.style.width = ''
          el.style.height = ''
          el.style.maxHeight = ''
          el.style.zIndex = ''
          el.style.margin = ''
          el.style.borderRadius = ''
          el.style.overflow = ''
          el.style.padding = ''
          const btn = el.querySelector('[title="收起"]')
          if (btn) { btn.innerHTML = '⛶'; btn.title = '展开代码' }
        })
      }
    })
  }

  // ─── Image Lightbox ─────────────────────────────────────────
  let lightboxActive = false

  function initLightbox() {
    const images = $$('.post-content img')
    images.forEach(function (img) {
      if (img.dataset.lb) return
      img.dataset.lb = 'true'
      img.style.cursor = 'zoom-in'
      img.addEventListener('click', function () {
        openLightbox(img)
      })
    })
  }

  function openLightbox(img) {
    if (lightboxActive) return
    lightboxActive = true

    const overlay = document.createElement('div')
    overlay.className = 'lightbox-overlay'
    overlay.style.cssText = 'position:fixed;inset:0;z-index:200;background:rgba(0,0,0,0.92);display:flex;align-items:center;justify-content:center;backdrop-filter:blur(8px)'

    const wrapper = document.createElement('div')
    wrapper.style.cssText = 'position:fixed;inset:0;display:flex;align-items:center;justify-content:center;overflow:hidden;z-index:200'

    const viewImg = document.createElement('img')
    viewImg.src = img.src
    viewImg.alt = img.alt || ''
    viewImg.style.cssText = 'max-width:90vw;max-height:85vh;object-fit:contain;border-radius:8px;transition:transform 0.2s;box-shadow:0 8px 40px rgba(0,0,0,0.5);cursor:zoom-out'

    const controls = document.createElement('div')
    controls.className = 'lightbox-controls'
    controls.style.cssText = 'position:fixed;bottom:2rem;left:50%;transform:translateX(-50%);display:flex;gap:0.5rem;align-items:center;z-index:201'

    function btn(text, title) {
      const b = document.createElement('button')
      b.textContent = text
      b.title = title
      b.style.cssText = 'background:rgba(255,255,255,0.2);border:none;border-radius:8px;padding:8px 14px;cursor:pointer;font-size:16px;color:white;line-height:1;transition:background 0.15s'
      b.addEventListener('mouseenter', function () { b.style.background = 'rgba(255,255,255,0.35)' })
      b.addEventListener('mouseleave', function () { b.style.background = 'rgba(255,255,255,0.2)' })
      return b
    }

    const zoomOutBtn = btn('🔍-', '缩小')
    const zoomInBtn = btn('🔍+', '放大')
    const rotateLeftBtn = btn('↺', '向左旋转')
    const rotateRightBtn = btn('↻', '向右旋转')
    const resetBtn = btn('⟲', '复位')
    const closeBtn = btn('✕ 关闭', '关闭 (ESC)')

    controls.appendChild(zoomOutBtn)
    controls.appendChild(zoomInBtn)
    controls.appendChild(rotateLeftBtn)
    controls.appendChild(rotateRightBtn)
    controls.appendChild(resetBtn)
    controls.appendChild(closeBtn)
    wrapper.appendChild(viewImg)
    overlay.appendChild(wrapper)
    overlay.appendChild(controls)
    document.body.appendChild(overlay)

    let scale = 1
    let rotation = 0
    let panX = 0
    let panY = 0
    let isDragging = false
    let wasDragged = false
    let dragStartX = 0
    let dragStartY = 0
    let dragPanX = 0
    let dragPanY = 0
    const DRAG_THRESHOLD = 5  // px — minimum movement to count as drag

    function updateTransform(animate) {
      viewImg.style.transition = animate ? 'transform 0.15s ease' : 'none'
      viewImg.style.transform = 'translate(' + panX + 'px, ' + panY + 'px) scale(' + scale + ') rotate(' + rotation + 'deg)'
    }

    function isZoomed() {
      return scale > 1.01 || rotation !== 0
    }

    // Mouse drag / pan — sets wasDragged to prevent overlay close
    viewImg.addEventListener('mousedown', function (e) {
      if (!isZoomed()) return
      e.preventDefault()
      isDragging = true
      wasDragged = false
      dragStartX = e.clientX
      dragStartY = e.clientY
      dragPanX = panX
      dragPanY = panY
      viewImg.style.cursor = 'grabbing'
    })

    document.addEventListener('mousemove', function (e) {
      if (!isDragging) return
      panX = dragPanX + (e.clientX - dragStartX)
      panY = dragPanY + (e.clientY - dragStartY)
      if (Math.abs(e.clientX - dragStartX) > DRAG_THRESHOLD || Math.abs(e.clientY - dragStartY) > DRAG_THRESHOLD) {
        wasDragged = true
      }
      updateTransform(false)
    })

    document.addEventListener('mouseup', function () {
      if (isDragging) {
        isDragging = false
        viewImg.style.cursor = isZoomed() ? 'grab' : 'zoom-out'
      }
    })

    // Touch support
    viewImg.addEventListener('touchstart', function (e) {
      if (!isZoomed()) return
      const t = e.touches[0]
      isDragging = true
      wasDragged = false
      dragStartX = t.clientX
      dragStartY = t.clientY
      dragPanX = panX
      dragPanY = panY
    }, { passive: true })

    document.addEventListener('touchmove', function (e) {
      if (!isDragging) return
      const t = e.touches[0]
      panX = dragPanX + (t.clientX - dragStartX)
      panY = dragPanY + (t.clientY - dragStartY)
      if (Math.abs(t.clientX - dragStartX) > DRAG_THRESHOLD || Math.abs(t.clientY - dragStartY) > DRAG_THRESHOLD) {
        wasDragged = true
      }
      updateTransform(false)
    }, { passive: true })

    document.addEventListener('touchend', function () {
      isDragging = false
    }, { passive: true })

    // Prevent overlay close if user just dragged
    viewImg.addEventListener('click', function (e) {
      if (wasDragged) {
        e.stopPropagation()
        wasDragged = false
      }
    })

    zoomInBtn.addEventListener('click', function () {
      scale = Math.min(scale * 1.3, 5)
      updateTransform(true)
    })

    zoomOutBtn.addEventListener('click', function () {
      scale = Math.max(scale / 1.3, 0.2)
      updateTransform(true)
    })

    rotateLeftBtn.addEventListener('click', function () {
      rotation = rotation - 90
      updateTransform(true)
    })

    rotateRightBtn.addEventListener('click', function () {
      rotation = rotation + 90
      updateTransform(true)
    })

    resetBtn.addEventListener('click', function () {
      scale = 1
      rotation = 0
      panX = 0
      panY = 0
      updateTransform(true)
    })

    closeBtn.addEventListener('click', function () {
      closeLb()
    })

    overlay.addEventListener('wheel', function (e) {
      e.preventDefault()
      scale = e.deltaY < 0 ? Math.min(scale * 1.15, 5) : Math.max(scale / 1.15, 0.2)
      updateTransform(true)
    }, { passive: false })

    function closeLb() {
      if (document.body.contains(overlay)) {
        document.body.removeChild(overlay)
      }
      lightboxActive = false
    }

    // Only close when clicking wrapper (dark padding around image), NOT the image itself
    wrapper.addEventListener('click', function (e) {
      if (e.target === wrapper) {
        closeLb()
      }
    })

    document.addEventListener('keydown', function lbKey(e) {
      if (e.key === 'Escape') {
        closeLb()
        document.removeEventListener('keydown', lbKey)
      }
    })
  }

  function codeBtnStyle() {
    return 'background:rgba(255,255,255,0.15);border:none;border-radius:6px;padding:6px 10px;cursor:pointer;font-size:15px;color:white;line-height:1;transition:background 0.15s'
  }

  // ─── Typewriter Effect for Hero Subtitle ──────────────────
  function initTypewriter() {
    const el = $('#heroSubtitle')
    if (!el) return
    const fullText = el.dataset.text || el.textContent
    if (!fullText) return

    let timer = null
    let state = 'typing'  // typing | waiting | erasing
    let pos = 0
    const typeSpeed = 100
    const eraseSpeed = 50
    const waitTime = 3000

    function tick() {
      if (state === 'typing') {
        pos++
        el.textContent = fullText.substring(0, pos)
        if (pos >= fullText.length) {
          state = 'waiting'
          clearTimeout(timer)
          timer = setTimeout(tick, waitTime)
          return
        }
        timer = setTimeout(tick, typeSpeed)
      } else if (state === 'erasing') {
        pos--
        el.textContent = fullText.substring(0, pos)
        if (pos <= 0) {
          state = 'typing'
          timer = setTimeout(tick, typeSpeed)
          return
        }
        timer = setTimeout(tick, eraseSpeed)
      } else {
        // waiting → start erasing
        state = 'erasing'
        timer = setTimeout(tick, eraseSpeed)
      }
    }

    // Start after a short delay
    el.textContent = ''
    setTimeout(function () {
      timer = setTimeout(tick, 300)
    }, 500)
  }

  // Init on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      enhanceCodeBlocks()
      initLightbox()
      initTypewriter()
    })
  } else {
    enhanceCodeBlocks()
    initLightbox()
    initTypewriter()
  }

  // Re-init on dynamic content (for pjax/hot reload scenarios)
  document.addEventListener('DOMContentLoaded', function () {
    // MutationObserver for dynamic content
    const observer = new MutationObserver(function () {
      enhanceCodeBlocks()
      initLightbox()
    })
    const postContent = $('#postContent')
    if (postContent) {
      observer.observe(postContent, { childList: true, subtree: true })
    }
  })
})();
