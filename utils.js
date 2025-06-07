function debounce(fn, delay) {
  let t;
  return () => {
    clearTimeout(t);
    t = setTimeout(fn, delay);
  };
}
