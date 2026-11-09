async function checkStatuses() {
  const res = await fetch('https://api.github.com/repos/santogetechnologies-cpu/Ferex-/deployments/7649755162/statuses');
  const data = await res.json();
  console.log('Statuses:', data);
}
checkStatuses();

