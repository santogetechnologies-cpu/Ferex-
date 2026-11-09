async function checkEarlier() {
  const res = await fetch('https://api.github.com/repos/santogetechnologies-cpu/Ferex-/deployments/7649450231/statuses');
  const data = await res.json();
  console.log('Earlier statuses:', data);
}
checkEarlier();

