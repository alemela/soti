function wannaSearch (query) {
  const url = new URL(location.protocol + '//' + location.host);
  url.searchParams.set('q', query);

  window.location.href = url.toString();
}
