if (!window.XTheme.loadedScript.has('header.js')) {
  window.XTheme.loadedScript.add('header.js');
  requestAnimationFrame(() => {
    document.addEventListener('alpine:init', () => {
      Alpine.store('xHeader', {
        showSearchBar: false,
        headerObserver: null,
        isSticky: false,
        sectionId: '',
        stickyType: 'none',
        scrollY: 0,
        stickyOffsetHeight: 0,
        initialized: false,
        passTop: false,
        passBottom: false,
        stickyTimeout: null,
        ignoreScroll: false,
        scrollTimeout: null,
        reset() {
          this.headerObserver.disconnect();
          if (document.getElementById('x-header-sentinel-top')) document.getElementById('x-header-sentinel-top').remove();
          if (document.getElementById('x-header-sentinel-bottom')) document.getElementById('x-header-sentinel-bottom').remove();
          Alpine.store('xHelper').cancelEvent(`eurus:header-scroll-event`);
          Alpine.store('xHelper').cancelEvent(`eurus:header-resize-event`);
          this.showSearchBar = false;
          this.isSticky = false;
          this.sectionId = '';
          this.stickyType = 'none';
          this.scrollY = 0;
          this.stickyOffsetHeight = 0;
          this.initialized = false;
          this.passTop = false;
          this.passBottom = false;
          this.ignoreScroll = false;
          clearTimeout(this.scrollTimeout);
          this.scrollTimeout = null;
        },
        debounce(func, wait) {
          let timeout;
          return function (...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
          };
        },
        initSticky(headerContainer, stickyType) {
          setTimeout(() => {
            this.stickyType = stickyType;
            if (stickyType === 'none') return;
            const header = document.getElementById(`shopify-section-${this.sectionId}`);

            const sentinelTop = document.createElement('div');
            sentinelTop.id = "x-header-sentinel-top"
            const sentinelBottom = document.createElement('div');
            sentinelBottom.id = "x-header-sentinel-bottom"
            header.before(sentinelTop);
            header.after(sentinelBottom);

            this.headerObserver = new IntersectionObserver((entries) => {
              entries.forEach(entry => {
                if (entry.target === header) {
                  if (!this.initialized) {
                    const rect = entry.boundingClientRect;
                    this.stickyOffsetHeight = rect.height;

                    this.initVariable(header, headerContainer, stickyType);
                    this.initScrollEvent(header, headerContainer, stickyType);

                    this.initialized = true;
                  }
                } else if (entry.target === sentinelTop) {
                  this.passTop = !entry.isIntersecting;
                } else {
                  this.passBottom = !entry.isIntersecting;
                  if (!this.passBottom && this.ignoreScroll) {
                    this.ignoreScroll = false;
                    clearTimeout(this.scrollTimeout);
                    this.scrollTimeout = null;
                  }
                }
              })
            })

            this.headerObserver.observe(header);
            this.headerObserver.observe(sentinelTop);
            this.headerObserver.observe(sentinelBottom);
          }, 0)
        },
        initVariable(header, headerContainer, stickyType) {
          requestAnimationFrame(() => {
            header.style.setProperty('--header-sticky-transform', `-${this.stickyOffsetHeight}px`);
            if (this.passBottom) {
              if (stickyType === 'scroll-up') {
                headerContainer.classList.add('is-sticky', 'is-scrolled');
                this.isSticky = true;
              } else {
                headerContainer.classList.add('is-sticky', 'is-scrolled');
                this.isSticky = true;
              } 
            }
          });
        },
        initScrollEvent(header, headerContainer, stickyType) {
          let scrollDebounce = null;
          const onScroll = () => {
            clearTimeout(scrollDebounce);
            scrollDebounce = setTimeout(() => {
              let scrollPos = window.scrollY || document.documentElement.scrollTop;
              this.handleStickyScrolling(headerContainer, stickyType, scrollPos);
            }, 10);
          };
          const headerScrollController = new AbortController();
          Alpine.store('xHelper').eventControllers.set(`eurus:header-scroll-event`, headerScrollController);
          window.addEventListener('scroll', onScroll, { passive: true, signal: headerScrollController.signal });

          const onResize = this.debounce(() => {
            this.stickyOffsetHeight = header.getBoundingClientRect().height;
            this.initVariable(header, headerContainer, stickyType);
          }, 150);
          const headerResizeController = new AbortController();
          Alpine.store('xHelper').eventControllers.set(`eurus:header-resize-event`, headerResizeController);
          window.addEventListener('resize', onResize, { passive: true, signal: headerResizeController.signal });
        },
        handleStickyScrolling(headerContainer, stickyType, scrollPos) {
          const dir = this.scrollY < scrollPos;
          this.scrollY = scrollPos;
          
          if (this.ignoreScroll && !dir) return;
          requestAnimationFrame(() => {
            if (stickyType === 'always') {
              if (this.passBottom) {
                headerContainer.classList.add('is-sticky', 'is-scrolled');
                this.isSticky = true;
              } else {
                headerContainer.classList.remove('is-sticky', 'is-scrolled');
                this.isSticky = false;
              }
            } else {
              if (!this.passTop) {
                headerContainer.classList.remove('is-sticky', 'is-scrolled');
                this.isSticky = false;
              }
              if (!this.passBottom && !dir) {
                headerContainer.style.transition = 'transform 0.1s ease-in';
                headerContainer.classList.remove('scroll-up-animation');
                clearTimeout(this.stickyTimeout);
                this.stickyTimeout = null;
                return;
              } else {
                headerContainer.style.transition = '';
              }
              if (this.passBottom && dir) {
                if (!this.stickyTimeout) {
                  this.stickyTimeout = setTimeout(() => {
                    headerContainer.classList.add('is-sticky', 'is-scrolled');
                    this.isSticky = true;
                    this.stickyTimeout = null;
                  }, 550);
                }
                headerContainer.classList.add('scroll-up-animation');
              } else {
                headerContainer.classList.remove('scroll-up-animation');
              }
            }
          });
        },
        suppressScroll(maxWait = 1000) {
          if (this.stickyType !== 'scroll-up') return;
          this.ignoreScroll = true;
          clearTimeout(this.scrollTimeout);
          const clear = () => {
            this.ignoreScroll = false;
            clearTimeout(this.scrollTimeout);
            this.scrollTimeout = null;
          };
          window.addEventListener('scrollend', clear, { once: true });

          this.scrollTimeout = setTimeout(clear, maxWait);
        }
      });
    });
  });
}