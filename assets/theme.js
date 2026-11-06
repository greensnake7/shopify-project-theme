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
        this.query = this.$el.value;
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