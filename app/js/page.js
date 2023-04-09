const slug = window.location.pathname.split('/').pop();

fetch("/api/get?id=" + slug, {
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
      navbarTemplate = Handlebars.compile(data);
    }),
    $.get('../template/page.html', function(data) {
      contenutoTemplate = Handlebars.compile(data);
    }),
    $.get('../template/footer.html', function(data) {
      footerTemplate = Handlebars.compile(data);
    })
  ).then(function() {
    // Compila i template con i dati desiderati
    const navbar = navbarTemplate({});
    const template = contenutoTemplate(data);
    const footer = footerTemplate({});

    // Inserisci i template compilati nei contenitori appropriati
    $('#navbar').html(navbar);
    $('#page').html(template);
    $('#footer').html(footer);
  });
})
