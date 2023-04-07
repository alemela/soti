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
          navbarTemplate = data;
        }),
        $.get('../template/footer.html', function(data) {
          footerTemplate = data;
        })
      ).then(function() {
        const navbar = Mustache.render(navbarTemplate, {});
        const footer = Mustache.render(footerTemplate, {});

        $('#navbar').html(navbar);
        $('#footer').html(footer);
      });

        let count = document.getElementById("ricetteCount");
        count.innerHTML = data.hits.total.value;


        for (i = 0; i < data.hits.hits.length; i++) {
          const hl = data.hits.hits[i].highlight;
          console.log(hl)
          for (key in hl) {
            console.log(hl[key]) //TODO finire l'hl, l'idea è di sostituire i campi dentro source se le chiavi sono presenti e aggiungere un boxino sotto se non lo sono
          }

          renderCard(data.hits.hits[i]._source);
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
    .catch(error => console.error("Errore: " +  error));
}

const renderCard = function (data) {
    let xhr = new XMLHttpRequest();
    xhr.open('GET', 'template/organic-card.html', true);
    xhr.onreadystatechange = function() {
        if (xhr.readyState === 4 && xhr.status === 200) {
            let template = xhr.responseText;

            data.tempo = data.tempi.filter(obj => {
                return obj.nome === "Totale"
            })[0].minuti;

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

            // Rendering del template Mustache con i dati JSON
            let rendered = Mustache.render(template, data);

            // Iniezione del template nella pagina HTML
            document.getElementById('results').innerHTML += rendered;
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
