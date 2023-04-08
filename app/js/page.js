const urlParams = new URLSearchParams(window.location.search);
const PAGE_ID  = urlParams.get('id');

fetch("/api/get?id=" + PAGE_ID, {
  headers : {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
    }
  }
).then(function(response){
  return response.json();
}).then(data => {
  data = data.hits.hits[0]._source;

  document.title = data.titolo + " - " + window.env.FE_WEBSITE_TITLE;

  let navbarTemplate, contenutoTemplate, footerTemplate;
  $.when(
    $.get('../template/navbar.html', function(data) {
      navbarTemplate = data;
    }),
    $.get('../template/page.html', function(data) {
      contenutoTemplate = data;
    }),
    $.get('../template/footer.html', function(data) {
      footerTemplate = data;
    })
  ).then(function() {
    // Compila i template con i dati desiderati
    const navbar = Mustache.render(navbarTemplate, {});
    const template = Mustache.render(contenutoTemplate, data);
    const footer = Mustache.render(footerTemplate, {});

    // Inserisci i template compilati nei contenitori appropriati
    $('#navbar').html(navbar);
    $('#page').html(template);
    $('#footer').html(footer);
  });
}).catch(error => console.error(error));
