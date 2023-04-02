function generatePaginationString(currentPage, totalPages) {
  const output = [];
  const range = 2; // range di pagine da visualizzare prima e dopo la pagina corrente

  if (currentPage > 1) output.push("<a>«</a>"); // aggiungi « all'inizio della stringa

  // Aggiungi la prima pagina alla stringa, se non è già visibile
  if (currentPage - range > 1) {
    output.push(`<a>1</a>`);
    if (currentPage - range > 2) {
      output.push("..."); // aggiungi i punti di sospensione se necessario
    }
  }

  // Aggiungi le pagine all'interno del range alla stringa
  for (let i = currentPage - range; i <= currentPage + range; i++) {
    if (i > 0 && i <= totalPages) {
      if (i === currentPage) {
        output.push(`<b><a>${i}</a></b>`);
      } else {
        output.push(`<a>${i}</a>`);
      }
    }
  }

  // Aggiungi l'ultima pagina alla stringa, se non è già visibile
  if (currentPage + range < totalPages) {
    if (currentPage + range < totalPages - 1) {
      output.push("..."); // aggiungi i punti di sospensione se necessario
    }
    output.push(`<a>${totalPages}</a>`);
  }

  if (currentPage < totalPages) output.push("<a>»</a>"); // aggiungi » alla fine della stringa

  return output.join(" ");
}
