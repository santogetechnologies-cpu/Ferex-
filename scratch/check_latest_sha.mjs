async function checkLatestSha() {
  const res = await fetch('https://api.github.com/repos/santogetechnologies-cpu/Ferex-/deployments?per_page=5');
  const data = await res.json();
  for (const d of data || []) {
    const sRes = await fetch(`https://api.github.com/repos/santogetechnologies-cpu/Ferex-/deployments/${d.id}/statuses`);
    const statuses = await sRes.json();
    const st = statuses[0];
    console.log(`Deployment ${d.id} (${d.environment}) SHA ${d.sha.slice(0, 7)}: state=${st?.state}`);
  }
}
checkLatestSha();

