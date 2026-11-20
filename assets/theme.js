window.xViewport = {
  innerWidth: 0,
  innerHeight: 0
}

const viewportObserver = new ResizeObserver(() => {
  window.xViewport.innerWidth = window.innerWidth;
  window.xViewport.innerHeight = window.innerHeight;
});

viewportObserver.observe(document.documentElement);

requestAnimationFrame(() => {
  // Optimize INP
  document.addEventListener('alpine:init', () => {
    Alpine.store('xDOM', {
      rePainting: null, // String: alias element re-painting.
    })
  })
})

requestAnimationFrame(() => {
  document.addEventListener('alpine:init', () => {
    Alpine.data('xModalSearch', (type, desktopMaximunResults, mobileMaximunResults, productTypeSelected) => ({
      open_search: '',
      t: '',
      result: ``,
      query: '',
      cachedResults: [],
      openResults: false,
      productTypeSelected: productTypeSelected,
      showSuggest: false,
      loading: false,
      open(refName) {
        this.$refs[refName]?.classList.remove("popup-hidden");
        const input_search = document.getElementById('search-in-modal');
        if (input_search) {
          setTimeout(() => {
            input_search.focus();
          }, 100);
        }
      },
      close(refName) {
        this.$refs[refName]?.classList.add("popup-hidden");
      },
      keyUp() {
        return () => {
          clearTimeout(this.t);
          this.t = setTimeout(() => {
            if (this.query != "") {
              this.showSuggest = false;
              this.getSearchResult(this.query);
            } else {
              this.showSuggest = true;
              this.result = "";
            }
          }, 300);
        };
      },
      getSearchResult(query) {
        this.openResults = true;
        const limit = window.xViewport.innerWidth > 767 ? desktopMaximunResults : mobileMaximunResults;
        let q = this.productTypeSelected != productTypeSelected ? `${this.productTypeSelected} AND ${query}` : query;

        const queryKey = q.replace(" ", "-").toLowerCase() + '_' + limit;

        if (this.cachedResults[queryKey]) {
          this.result = this.cachedResults[queryKey];
          return;
        }

        this.loading = true;
        const field = "author,body,product_type,tag,title,variants.barcode,variants.sku,variants.title,vendor"
        fetch(`${Shopify.routes.root}search/suggest?q=${encodeURIComponent(q)}&${encodeURIComponent('resources[type]')}=${encodeURIComponent(type)}&${encodeURIComponent('resources[options][fields]')}=${encodeURIComponent(field)}&${encodeURIComponent('resources[limit]')}=${encodeURIComponent(limit)}&section_id=predictive-search`)
          .then((response) => {
            return response.text();
          })
          .then((response) => {
            const parser = new DOMParser();
            const text = parser.parseFromString(response, 'text/html');
            this.result = text.getElementById("shopify-section-predictive-search").innerHTML;
            this.cachedResults[queryKey] = this.result;
          })
          .catch((error) => {
            throw error;
          });
        this.loading = false;
      },
      setProductType(value, input) {
        this.productTypeSelected = value;
        document.getElementById(input).value = value;
        if(this.query != '') {
          this.getSearchResult(this.query);
        }
      },
      focusForm() {
        if (this.$el.value != '') {
          this.showSuggest = false;
        } else {
          this.showSuggest = true;
        }
      }
    }));
  });
});

requestAnimationFrame(() => {
  document.addEventListener('alpine:init', () => {
    Alpine.store('xVariantPickerSizeChart', {
      openSizeChart: false ,
      sizeChartFocus() {
        Alpine.store('xFocusElement').trapFocus('VariantPickerSizeChart','CloseVariantPickerSizeChart');
      },
      sizeChartRemoveFocus() {
        const activeElement = document.getElementById('OpenVariantPickerSizeChart');
        Alpine.store('xFocusElement').removeTrapFocus(activeElement);
        this.openSizeChart = false; 
        Alpine.store('xPopup').close();
      }
    })
    Alpine.store('xHelper', {
      toUpdate: [],
      requestControllers: new Map(),
      eventControllers: new Map(),
      fbtProductListDraft: [],
      cancelRequest(key) {
        const controller = this.requestControllers.get(key);
        if (controller) {
          controller.abort();
          this.requestControllers.delete(key);
        }
      },
      cancelEvent(key) {
        const controller = this.eventControllers.get(key);
        if (controller) {
          controller.abort();
          this.eventControllers.delete(key);
        }
      },
      formatMoney(amount, formatString) {
        var placeholderRegex = /\{\{\s*(\w+)\s*\}\}/;
        let value = this.formatWithDelimiters(amount, 2);
        switch(formatString.match(placeholderRegex)[1]) {
          case 'amount':
            value = this.formatWithDelimiters(amount, 2);
            break;
          case 'amount_no_decimals':
            value = this.formatWithDelimiters(amount, 0);
            break;
          case 'amount_with_comma_separator':
            value = this.formatWithDelimiters(amount, 2, '.', ',');
            break;
          case 'amount_no_decimals_with_comma_separator':
            value = this.formatWithDelimiters(amount, 0, '.', ',');
            break;
          case 'amount_with_apostrophe_separator ':
            value = this.formatWithDelimiters(amount, 2, "'", '.');
            break;
          case 'amount_no_decimals_with_space_separator':
            value = this.formatWithDelimiters(amount, 0, ' ', ',')
            break;
          case 'amount_with_space_separator':
            value = this.formatWithDelimiters(amount, 2, ' ', ',')
            break;
          case 'amount_with_period_and_space_separator':
            value = this.formatWithDelimiters(amount, 2, ' ', '.')
            break;
        } 
        return formatString.replace(placeholderRegex, value);
      },
      defaultOption(opt, def) {
        return (typeof opt == 'undefined' ? def : opt);
      },
      formatWithDelimiters(number, precision, thousands, decimal) {
        precision = this.defaultOption(precision, 2);
        thousands = this.defaultOption(thousands, ',');
        decimal   = this.defaultOption(decimal, '.');
    
        if (isNaN(number) || number == null) { return 0; }
        number = (number/100.0).toFixed(precision);
    
        var parts   = number.split('.'),
            dollars = parts[0].replace(/(\d)(?=(\d\d\d)+(?!\d))/g, '$1' + thousands),
            cents   = parts[1] ? (decimal + parts[1]) : '';
    
        return dollars + cents;
      },
      countdown(configs, callback) {
        const maxAttempt = 100;

        let endDate = new Date(
          configs.end_year,
          configs.end_month - 1,
          configs.end_day,
          configs.end_hour,
          configs.end_minute
        );
        let reset = configs.reset;
        let duration = configs.duration;
        let endTime = endDate.getTime() + (-1 * configs.timezone * 60 - endDate.getTimezoneOffset()) * 60 * 1000;
        
        let startTime;
        if (configs.start_year) {
          let startDate = new Date(
            configs.start_year,
            configs.start_month - 1,
            configs.start_day,
            configs.start_hour,
            configs.start_minute
          );
          startTime = startDate.getTime() + (-1 * configs.timezone * 60 - startDate.getTimezoneOffset()) * 60 * 1000;
          if (reset) {
            endDate = new Date(startTime + duration);
            endTime = endDate.getTime();
          }
        } else {
          if (reset) {
            startTime = endTime;
            endDate = new Date(startTime + duration);
            endTime = endDate.getTime();
          } else {
            startTime = new Date().getTime();
          }
        }

        if (new Date().getTime() < startTime) {
          callback(false, 0, 0, 0, 0);
          return;
        }

        const startInterval = () => {
          let x = setInterval(() => {
            let now = new Date().getTime();
            let distance = 0;

            distance = endTime - now;
            if (distance < 0) {
              clearInterval(x);
              if (reset) {
                let attempt = 0;
                while (distance < 0 && attempt < maxAttempt) {
                  attempt++;
                  if (attempt == 1) {
                    let elapsed = now - startTime;
                    let loopOffset = Math.floor(elapsed / duration) - 1;

                    startTime = startTime + loopOffset * duration;
                  } else {
                    startTime = endTime;
                  }
                  endDate = new Date(startTime + duration);
                  endTime = endDate.getTime();
                  distance = endTime - now;
                }
                if (attempt >= maxAttempt) {
                  callback(false, 0, 0, 0, 0);
                  return;
                }
                startInterval();
              } else {
                callback(false, 0, 0, 0, 0);
                return;
              }
            }
            if (distance > 0) {
              var days = Math.floor(distance / (1000 * 60 * 60 * 24));
              var hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
              var minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
              var seconds = Math.floor((distance % (1000 * 60)) / 1000);

              minutes = minutes < 10 ? '0' + minutes : '' + minutes;
              seconds = seconds < 10 ? '0' + seconds : '' + seconds;

              callback(true, seconds, minutes, hours, days);
            }
          }, 1000);
        }

        startInterval();
      },
      canShow(configs) {
        let endDate = new Date(
          configs.end_year,
          configs.end_month - 1,
          configs.end_day,
          configs.end_hour,
          configs.end_minute
        );
        const endTime = endDate.getTime() + (-1 * configs.timezone * 60 - endDate.getTimezoneOffset()) * 60 * 1000;
        
        let startTime;
        if (configs.start_year) {
          let startDate = new Date(
            configs.start_year,
            configs.start_month - 1,
            configs.start_day,
            configs.start_hour,
            configs.start_minute
          );
          startTime = startDate.getTime() + (-1 * configs.timezone * 60 - startDate.getTimezoneOffset()) * 60 * 1000;
        } else {
          startTime = new Date().getTime();
        }
        let now = new Date().getTime();
        let distance = endTime - now;
        if (distance < 0 || startTime > now) {
          return false;
        } 
        return true;
      },
      handleTime(configs) {
        let endDate = new Date(
          configs.end_year,
          configs.end_month - 1,
          configs.end_day,
          configs.end_hour,
          configs.end_minute
        );
        const endTime = endDate.getTime() + (-1 * configs.timezone * 60 - endDate.getTimezoneOffset()) * 60 * 1000;
        
        let startTime;
        if (configs.start_year) {
          let startDate = new Date(
            configs.start_year,
            configs.start_month - 1,
            configs.start_day,
            configs.start_hour,
            configs.start_minute
          );
          startTime = startDate.getTime() + (-1 * configs.timezone * 60 - startDate.getTimezoneOffset()) * 60 * 1000;
        } else {
          startTime = new Date().getTime();
        }
        let now = new Date().getTime();
        let distance = endTime - now;
        return { "startTime": startTime, "endTime": endTime, "now": now, "distance": distance};
      },
      centerElement(el) {
        let resizeTimeout;
        let currTranslate = 0;
    
        const update = () => {
          window.requestAnimationFrame(() => {
            const rect = el.getBoundingClientRect();
            const translate = rect.left + Math.abs(currTranslate) - (document.documentElement.clientWidth - rect.width) / 2;
            el.style.transform = `translateX(-${translate}px)`;
            currTranslate = translate;
          })
        };
    
        window.addEventListener('resize', () => {
          clearTimeout(resizeTimeout);
          resizeTimeout = setTimeout(update, 150);
        });

        update();
      }
    });
    Alpine.store('xInit', {
      runDispatch: true,
      init() {
        const fire = () => {
          if (!this.runDispatch) return;
          this.runDispatch = false;
          window.dispatchEvent(new CustomEvent('init-run'));
        };
        const idle = window.requestIdleCallback || ((cb) => setTimeout(cb, 1000));
        idle(fire, { timeout: 1500 });
        ['pointerdown', 'keydown', 'scroll', 'touchstart'].forEach(evt => {
          window.addEventListener(evt, fire, { once: true, passive: true });
        });
      }
    });
  });
});

document.addEventListener('alpine:init', () => {
  Alpine.store('xOverlay', {
    stopScroll: false,
    open() {
      requestAnimationFrame(() => {
        this.stopScroll = true;
      })
    },
    close() {
      requestAnimationFrame(() => {
        this.stopScroll = false;
      })
    }
  })
})

requestAnimationFrame(() => {
  document.addEventListener('alpine:init', () => {
    Alpine.store('xSplide', {
      load(el, configs) {
        const initSlider = () => {
          const id = el.getAttribute("id");
          if(configs.classes != undefined) {
            if (!configs.classes.arrow) configs.classes.arrow = "arrow w-8 h-8 pt-2 pb-2 pl-2 pr-2 absolute z-10 top-1/2 -translate-y-1/2 hidden md:flex items-center justify-center";
            if (!configs.classes.next) configs.classes.next = "right-0";
            if (!configs.classes.prev) configs.classes.prev = "-rotate-180";
          }
          let splide = new Splide("#" + id, configs);
          if (configs.thumbs) {
            let thumbsRoot = document.getElementById(configs.thumbs);
            let thumbs = thumbsRoot.getElementsByClassName('x-thumbnail');
            let current;
            let _this = this;

            for (let i = 0; i < thumbs.length; i++) {
              if (thumbs[i] == current) {
                if (configs.enableThumbnailOverlay) {
                  thumbs[i].classList.remove('opacity-30');
                  thumbs[i].classList.add('quickview-border');
                } else {
                  thumbs[i].classList.add('border');
                }
              } else {
                if (configs.enableThumbnailOverlay) {
                  thumbs[i].classList.add('opacity-30');
                  thumbs[i].classList.remove('quickview-border');
                } else {
                  thumbs[i].classList.remove('border');
                }
              }
              thumbs[i].addEventListener('click', function () {
                _this.moveThumbnail(i, thumbs[i], thumbsRoot, configs.thumbs_direction, configs.direction);
                splide.go(i);
              });
            }

            splide.on('refresh', function () {
              for (let i = 0; i < thumbs.length; i++) {
                thumbs[i].removeEventListener('click', function () {
                  _this.moveThumbnail(i, thumbs[i], thumbsRoot, configs.thumbs_direction, configs.direction);
                  splide.go(i);
                });
              }

              let thumbsRoot = document.getElementById(configs.thumbs);
              let thumbsNew = thumbsRoot.getElementsByClassName('x-thumbnail');

              for (let i = 0; i < thumbsNew.length; i++) {
                if (i == 0) {
                  if (configs.enableThumbnailOverlay) {
                    thumbsNew[i].classList.remove('opacity-30');
                    thumbsNew[i].classList.add('quickview-border');
                  } else {
                    thumbsNew[i].classList.add('border');
                  }
                } else {
                  if (configs.enableThumbnailOverlay) {
                    thumbsNew[i].classList.add('opacity-30');
                    thumbsNew[i].classList.remove('quickview-border');
                  } else {
                    thumbsNew[i].classList.remove('border');
                  }
                }
                
                thumbsNew[i].addEventListener('click', function () {
                  _this.moveThumbnail(i, thumbsNew[i], thumbsRoot, configs.thumbs_direction, configs.direction);
                  splide.go(i);
                });
              }
            })
            splide.on('mounted move', function () {
              let thumbnail = thumbs[splide.index];
              if (thumbnail) {
                if (current) {
                  if (configs.enableThumbnailOverlay) {
                    current.classList.add('opacity-30');
                    current.classList.remove('quickview-border');
                  } else {
                    current.classList.remove('border');
                  }
                }
                if (configs.enableThumbnailOverlay) {
                  thumbnail.classList.remove('opacity-30');
                  thumbnail.classList.add('quickview-border');
                } else {
                  thumbnail.classList.add('border')
                }
                current = thumbnail;
                _this.moveThumbnail(splide.index, thumbnail, thumbsRoot, configs.thumbs_direction, configs.direction);
              }
            });
          }

          if (configs.hotspot) {
            let hotspotRoot = document.getElementById(configs.hotspot);
            let hotspots = hotspotRoot.getElementsByClassName('x-hotspot');
            let current;

            if (configs.disableHoverOnTouch && (('ontouchstart' in window) || window.DocumentTouch && window.document instanceof DocumentTouch || window.navigator.maxTouchPoints || window.navigator.msMaxTouchPoints)) {
              for (let i = 0; i < hotspots.length; i++) {
                hotspots[i].addEventListener('click', function () {
                  splide.go(i);
                });
              }
            } else {
              for (let i = 0; i < hotspots.length; i++) {
                hotspots[i].addEventListener('mouseover', function () {
                  splide.go(i);
                });
                hotspots[i].addEventListener('focus', function () {
                  splide.go(i);
                });
              }             
            }
            splide.on('mounted move', function () {
              let hotspot = hotspots[splide.index];
              
              if (hotspot) {
                if (current) {
                  current.classList.remove('active-hotspot');
                }
                hotspot.classList.add('active-hotspot');
                current = hotspot;
              }
            });
          }
          if (configs.cardHover) {
            let cardImage = document.getElementById(configs.cardHover);
            if (window.xViewport.innerWidth > 1024) {
              cardImage.addEventListener('mousemove', function (e) {
                let left = e.offsetX;
                let width = cardImage.getBoundingClientRect().width;
                let spacing = left / width;
                let index = Math.floor(spacing * configs.maxSlide);
                splide.go(index);
              });
              cardImage.addEventListener('mouseleave', function (e) {
                splide.go(0);
              });
            }
          }
          if (configs.progressBar) {
            var bar = splide.root.querySelector( '.splide-progress-bar' );
            splide.on( 'mounted move refresh', function () {
              var end  = configs.progressBar;
              if (configs.progressBarHeader) {
                end  = splide.Components.Slides.getLength();
              }
              var rate = 100 * (splide.index / end);
              if (bar) {
                var widthBar =  window.getComputedStyle(bar).getPropertyValue('width').replace("px", '');
                var widthProgressBar = window.getComputedStyle(bar.closest('.splide-progress')).getPropertyValue('width').replace("px", '');
                var percentBar = 100 * (Number(widthBar) /  Number(widthProgressBar));
                var rateBar = rate + percentBar;
                var maxRate = 100 - percentBar;
                if (rateBar > 100 ) {
                  rate = maxRate;
                }
                if (document.querySelector('body').classList.contains('rtl')) {
                  bar.style.marginRight = rate + '%';
                } else {
                  bar.style.marginLeft = rate + '%';
                }  
              }
            });
            var progressBar = splide.root.querySelector( '.splide-progress' );
            progressBar?.addEventListener('click', function (e) {
              var rect = progressBar.getBoundingClientRect();
              var clickX = e.clientX - rect.left;
              var percent = clickX / rect.width;
              var totalPages = Math.ceil(splide.length / splide.options.perPage);
              var page = Math.floor(percent * totalPages);
              if (page >= totalPages) page = totalPages - 1;
              var index = page * splide.options.perPage;
              splide.go(index);
            });
          }
          if(el.classList.contains('card-product-img')) {
            splide.on('resized', function() { 
              var height = splide.root.querySelector('.splide__track').offsetHeight;
              splide.Components.Slides.get().forEach((item) => {
                item.slide.style.height = height+"px";
              });
            }) 
          }

          if (configs.paginationScroll) {
            const MAX_DOTS = 7;
            splide.on('pagination:mounted pagination:updated', ({ list, items }) => {
              const n = items.length;
              if (n <= MAX_DOTS) return;
              const page = splide.Components.Controller.toPage(splide.index);
              const start = Math.max(0, page - 3);
              const visibleDots = Math.min(n - 1, page + 3) - start + 1;
              list.style.setProperty('--visible-dots', visibleDots);
              list.classList.add('dots-scroll');
              list.style.setProperty('--dots-start', start);

              items.forEach(({ li }, i) => {
                const distance = Math.abs(i - page);
                li.style.setProperty('--dot-scale', distance > 3 ? 0 : [1.5, 1.25, 1, 0.5][distance]);
              });
            });
          }

          if (configs.events) {
            configs.events.forEach((e) => {
              splide.on(e.event, e.callback);
            });
          }

          el.splide = splide;
          splide.mount();
          console.log('splide:mount');
          if (configs.videoProduct) {
            const move = splide.Components.Move;
            move.translate(move.toPosition(0));  
          }

          if (configs.playOnHover) {
            const breakPoint = window.matchMedia('(min-width: 1024px)');
            breakPoint.addEventListener('change', () => {
              if (breakPoint.matches) splide.Components.Autoplay.pause();
            })
          }

          if (configs.playOnHover && window.innerWidth > 1024) {
            splide.Components.Autoplay.pause();
            el.onmouseover = function() {
              splide.Components.Autoplay.play();
            };
            el.onmouseout = function() {
              splide.Components.Autoplay.pause();
            };
          }
        }

        if (window.Splide) {
          console.log('yes');
          initSlider();
        } else {
          console.log('no');
          window.addEventListener('load', initSlider, { once: true });
        }
      },
      togglePlayPause(el) {
        if (!el || !el.splide || !el.splide.Components.Autoplay) return;
      
        const splide = el.splide;
        const autoplay = splide.Components.Autoplay;
      
        if (autoplay.isPaused()) {
          autoplay.play();
        } else {
          splide.go(0);
          autoplay.pause();
        }
      },
      moveThumbnail(index, thumbnail, thumbsRoot, direction) {
        if (thumbnail) {
          if (direction == 'vertical') {
            const thumbnailHeight = thumbnail.offsetHeight;
            const rootHeight = thumbsRoot.offsetHeight;
            setTimeout(() => {
              window.requestAnimationFrame(() => {
                thumbsRoot.scrollTop = (index + 1) * thumbnailHeight - rootHeight * 0.5 + thumbnailHeight * 0.5 + index * 6;
              })
            },50);
          } else {
            thumbsRoot.scrollLeft = (index - 2) * thumbnail.offsetWidth;
          }
        }
      },
      jumpToLast(el) {
        const splide = el.splide;
        const controller = splide.Components.Controller;

        const index = controller.getEnd() + 2
        splide.go(index);
      }
    });
  });
});