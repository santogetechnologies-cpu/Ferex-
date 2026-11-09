async function findLastSuccess() {
  const res = await fetch('https://api.github.com/repos/santogetechnologies-cpu/Ferex-/deployments?per_page=20');
  const data = await res.json();
  for (const d of data || []) {
    const sRes = await fetch(`https://api.github.com/repos/santogetechnologies-cpu/Ferex-/deployments/${d.id}/statuses`);
    const statuses = await sRes.json();
    const st = statuses[0];
    console.log(`Deployment ${d.id} (${d.environment}) SHA ${d.sha.slice(0, 7)}: state=${st?.state}, desc=${st?.description}`);
    if (st?.state === 'success') {
      console.log('>>> LAST SUCCESSFUL DEPLOYMENT:', d.sha, st.target_url);
      break;
    }
  }
}
findLastSuccess();

