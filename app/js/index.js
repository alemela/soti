document.title = window.env.FE_WEBSITE_TITLE;

// valore di un tag pronto per l'URL: i tag evidenziati contengono <span class="hl">, da togliere
Handlebars.registerHelper('tagParam', value => encodeURIComponent(String(value).replace(/<[^>]*>/g, '')));

const search = function (q) {
  const url = new URL(window.location.href); // crea un oggetto URL dal URL della pagina corrente
  url.searchParams.set('q', q);

  // carica il file JSON contenente i dati della ricetta
  fetch('/api/search' + url.search, {
      headers : {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
      }
      }
  ).then(function(response){
      return response.json();
  }).then(data => {
    let navbarTemplate, footerTemplate, cardTemplate, sidebarTemplate;
    $.when(
      $.get('../template/navbar.html', function(data) {
        navbarTemplate = Handlebars.compile(data);
      }),
      $.get('../template/footer.html', function(data) {
        footerTemplate = Handlebars.compile(data);
      }),
      $.get('../template/organic-card.html', function(data) {
        cardTemplate = Handlebars.compile(data);
      }),
      $.get('../template/sidebar.html', function(data) {
        sidebarTemplate = Handlebars.compile(data);
      })
    ).then(function() {
      const navbar = navbarTemplate({});
      const footer = footerTemplate({});

      $('#navbar').html(navbar);
      $('#footer').html(footer);

      //filtri
      $('#sidebar').html(sidebarTemplate({ filters: sidebarFilters(data.aggregations) }));

      $('.filter-term').change(function() {
        const field = this.dataset.field;
        const values = activeValues(field).filter(value => value !== this.value);
        if (this.checked) values.push(this.value);
        applyFilter(field, values.join('|'));
      });

      $('.filter-range').each(function() {
        const box = $(this);
        const from = box.find('.range-from');
        const to = box.find('.range-to');

        box.find('input').on('input', function() {
          // gli estremi non si possono incrociare
          if (Number(from.val()) > Number(to.val())) (this === from[0] ? to : from).val(this.value);
          box.find('.range-from-value').text(from.val());
          box.find('.range-to-value').text(to.val());
        });

        box.find('input').on('change', function() {
          const whole = from.val() === from.attr('min') && to.val() === to.attr('max');
          applyFilter(box.data('field'), whole ? '' : from.val() + '-' + to.val());
        });
      });

      let count = document.getElementById("resultsCount");
      if (data.hits.total.value === 1) count.innerHTML = data.hits.total.value + " " + window.env.FE_RESULT_NAME;
      if (data.hits.total.value !== 1) count.innerHTML = data.hits.total.value + " " + window.env.FE_RESULTS_NAME;

      for (i = 0; i < data.hits.hits.length; i++) {
        const hl = data.hits.hits[i].highlight;
        const source = data.hits.hits[i]._source;

        source.hl2 = [];
        for (key in hl) {
          if (window.env.FE_HL_1.includes(key)) source[key] = hl[key];
          if (window.env.FE_HL_2.includes(key)) source["hl2"].push({[key]: hl[key]});
        }

        source.difficoltà_stringa = "Difficoltà ignota";
        switch (source.difficoltà) {
            case 1:
                source.difficoltà_stringa = "Molto facile";
                break;
            case 2:
                source.difficoltà_stringa = "Facile";
                break;
            case 3:
                source.difficoltà_stringa = "Intermedia";
                break;
            case 4:
                source.difficoltà_stringa = "Difficile";
                break;
            case 5:
                source.difficoltà_stringa = "Molto difficile";
                break;
            default:
                break;
        }

        document.getElementById('results').innerHTML += cardTemplate(source);
      }

    });

    const urlParams = new URLSearchParams(window.location.search);
    const currentPage = urlParams.get('page') || 1;
    const size = urlParams.get('size') || 10;
    const totalPages = Math.ceil(data.hits.total.value / size)

    $('#pagination').html(generatePaginationString(parseInt(currentPage), totalPages))
    $('#pagination a').on('click', function(e) {
        e.preventDefault(); // previene il comportamento predefinito del click sul link
        let page = $(this).text(); // ottiene il numero della pagina dal contenuto del link

        if (page === "«") page = parseInt(currentPage)-1;
        if (page === "»") page = parseInt(currentPage)+1;

        const url = new URL(window.location.href); // crea un oggetto URL dal URL della pagina corrente
        url.searchParams.set('page', page); // imposta il valore del parametro "page" con il nuovo valore
        url.searchParams.set('size', size); // imposta il valore del parametro "page" con il nuovo valore
        window.location.href = url.href; // reindirizza la pagina al nuovo URL
    });

    $('#main-sort').html(generateSortString(window.env.FE_ORDER_BY))

    $('.sort-item').on("click", function() {
      const url = new URL(window.location.href); // crea un oggetto URL dal URL della pagina corrente
      url.searchParams.set("sort", $(this).attr("value"));
      window.location.href = url.href;
    });

  });
}

// Valori attivi di un filtro "terms" (il vecchio parametro "tags" vale come "tag").
function activeValues(field) {
  const params = new URLSearchParams(window.location.search);
  const raw = [params.get(field), field === 'tag' ? params.get('tags') : null].filter(Boolean).join('|');
  return raw ? raw.split('|') : [];
}

// Imposta (o toglie, se value è vuoto) un filtro e ricarica la ricerca.
function applyFilter(field, value) {
  const url = new URL(window.location.href);
  if (field === 'tag') url.searchParams.delete('tags');
  if (value) url.searchParams.set(field, value);
  else url.searchParams.delete(field);
  url.searchParams.delete('page'); // con filtri diversi la pagina corrente potrebbe non esistere più
  window.location.href = url.href; //XXX è scomodo che ricarichi
}

// Dati per il template della sidebar: un filtro per ogni aggregazione restituita
// dal server, nell'ordine configurato in FILTERS.
function sidebarFilters(aggregations) {
  const params = new URLSearchParams(window.location.search);
  const filters = [];

  for (const key in aggregations) {
    const agg = aggregations[key];
    const filter = { key, label: agg.meta.label };

    if (agg.meta.type === 'terms') {
      const active = activeValues(key);
      filter.terms = true;
      filter.active = active.length > 0;
      filter.buckets = agg.buckets.map(b => Object.assign({}, b, { checked: active.includes(b.key) }));
    } else if (agg.meta.type === 'range' && agg.min !== null) {
      const [from, to] = (params.get(key) || '-').split('-');
      filter.range = true;
      filter.active = params.has(key);
      filter.min = agg.min;
      filter.max = agg.max;
      filter.from = from !== '' ? Math.max(Number(from), agg.min) : agg.min;
      filter.to = to !== undefined && to !== '' ? Math.min(Number(to), agg.max) : agg.max;
    } else {
      continue;
    }
    filters.push(filter);
  }
  return filters;
}

function generateSortString(sortConfig) {
  const voci = sortConfig.split(", ");
  let string = '<span class="dropdown-item sort-item" value="">Rilevanza</span>';

  for (let i = 0; i < voci.length; i++) {
    const el = voci[i].split("|");
    string += `<span class="dropdown-item sort-item" value="${el[0]}-asc">${el[1]}: ${el[2]}</span>`
    string += `<span class="dropdown-item sort-item" value="${el[0]}-desc">${el[1]}: ${el[3]}</span>`
  }
  return string;
}

function loadPage (query) {
  const url = new URL(window.location);
  const searchParams = new URLSearchParams(url.search);
  const q = searchParams.get("q") || '';

  search(q);
}

// Inizializza tutti i dropdown con data-toggle="dropdown"
$('.dropdown-toggle').dropdown();

$(document).ready(function() {
  $('#sidebarToggle').click(function() {
    $('.sidebar').toggleClass('show');
  });

  // la sidebar viene caricata dopo, quindi il click va delegato al document
  $(document).on('click', '#sidebarClose', function() {
    $('.sidebar').removeClass('show');
  });
});





loadPage();
