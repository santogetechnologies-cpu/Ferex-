async function checkHtmlFull() {
  const res = await fetch('https://education.ferexventures.com');
  const text = await res.text();
  console.log('HTML Full:\n', text);
}
checkHtmlFull();
