async function check5498Deploy() {
  const sha = '5498bc9a3aa19a756fa875654666106ac67dd896';
  const res = await fetch(`https://api.github.com/repos/santogetechnologies-cpu/Ferex-/deployments?sha=${sha}`);
  const data = await res.json();
  console.log('Deployments for 5498bc9:', data);
  for (const d of data || []) {
    const sRes = await fetch(`https://api.github.com/repos/santogetechnologies-cpu/Ferex-/deployments/${d.id}/statuses`);
    const statuses = await sRes.json();
    console.log(`Status for ${d.id}:`, statuses[0]);
  }
}
check5498Deploy();

