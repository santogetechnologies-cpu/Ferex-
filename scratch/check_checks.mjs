async function checkChecks() {
  try {
    const res = await fetch('https://api.github.com/repos/santogetechnologies-cpu/Ferex-/commits/663a777fe94cbd0a1f4584ae44da5ee6e923c626/check-runs');
    const data = await res.json();
    console.log('Check runs:', data.total_count, (data.check_runs || []).map(c => ({ name: c.name, status: c.status, conclusion: c.conclusion })));
  } catch (err) {
    console.error('Error fetching checks:', err);
  }
}
checkChecks();

