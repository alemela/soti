document.title = window.env.FE_WEBSITE_TITLE;

const search = function (q) {
    const url = new URL(window.location.href); // crea un oggetto URL dal URL della pagina corrente
    url.searchParams.set('q', q);

    console.log(url.search  )

    // carica il file JSON contenente i dati della ricetta
    fetch('/api/search' + url.search, {
        headers : {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
        }
        }
    ).then(function(response){
        return response.json();
    })
    .then(data => {
      let navbarTemplate, contenutoTemplate, footerTemplate;
      $.when(
        $.get('../template/navbar.html', function(data) {
          navbarTemplate = Handlebars.compile(data);;
        }),
        $.get('../template/footer.html', function(data) {
          footerTemplate = Handlebars.compile(data);;
        })
      ).then(function() {
        const navbar = navbarTemplate({});
        const footer = footerTemplate({});

        $('#navbar').html(navbar);
        $('#footer').html(footer);
      });

        let count = document.getElementById("ricetteCount");
        count.innerHTML = data.hits.total.value;

        //Gestione highlight
        for (i = 0; i < data.hits.hits.length; i++) {
          const hl = data.hits.hits[i].highlight;
          const source = data.hits.hits[i]._source;

          source.hl2 = [];
          for (key in hl) {
            if (window.env.FE_HL_1.includes(key)) source[key] = hl[key];
            if (window.env.FE_HL_2.includes(key)) source["hl2"].push({[key]: hl[key]});
          }

          console.log(source)
          renderCard(source);
        }

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

        //filtri
        $('#tags-filter').html(generateTags(data.aggregations.tags.buckets));

        $('input:checkbox').change(function() {
          console.log('Toggle: ' + $(this).prop('checked'));
          console.log("Change event: " + this.id);

          const url = new URL(window.location.href);
          console.log(url.href)
          const actualTags = url.searchParams.get('tags');
          console.log(actualTags)
          if ( $(this).prop('checked') ) {
            if (!actualTags) {
              url.searchParams.set('tags', this.id);
            } else {
              url.searchParams.set('tags', actualTags + "|" + this.id);
            }
          } else {
            //urlParams.remove('tags', this.id) //TODO
          }
          console.log(url.href)
          window.location.href = url.href; //XXX è scomodo che ricarichi
        })

    })
}

const renderCard = function (data) {
    let xhr = new XMLHttpRequest();
    xhr.open('GET', 'template/organic-card.html', true);
    xhr.onreadystatechange = function() {
        if (xhr.readyState === 4 && xhr.status === 200) {
            const template = xhr.responseText;

            data.difficoltà_stringa = "Difficoltà ignota";
            switch (data.difficoltà) {
                case 1:
                    data.difficoltà_stringa = "Molto facile";
                    break;
                case 2:
                    data.difficoltà_stringa = "Facile";
                    break;
                case 3:
                    data.difficoltà_stringa = "Intermedia";
                    break;
                case 4:
                    data.difficoltà_stringa = "Difficile";
                    break;
                case 5:
                    data.difficoltà_stringa = "Molto difficile";
                    break;
                default:
                    break;
            }

            const render = Handlebars.compile(template);
            document.getElementById('results').innerHTML += render(data);
        }
    };
    xhr.send();
}

function generateTags(tags) {
  const output = [];

  for (tag in tags) {
    output.push(`<input class="form-check-input" type="checkbox" value="" id="${tags[tag].key}">`);
    output.push(`<label class="form-check-label" for="${tags[tag].key}">${tags[tag].key} - ${tags[tag].doc_count}</label><br>`);
  }

  return output.join(" ");
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

    $('#sidebarClose').click(function() {
      $('.sidebar').removeClass('show');
    });
});


loadPage();

//TODO finire la lettura dei parametri URL per disegnare la zona dei filtri attivi
const searchParams = new URLSearchParams(window.location.search);
console.log(Array.from(searchParams.keys()))
for (const key of searchParams.keys()) {
  console.log(key);
  console.log(searchParams.get(key))
}
