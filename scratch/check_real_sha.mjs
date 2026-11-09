async function checkRealSha() {
  const sha = '5498bc9a3aa19a756fa875654666106ac67dd896';
  const res = await fetch(`https://api.github.com/repos/santogetechnologies-cpu/Ferex-/commits/${sha}/check-runs`);
  const data = await res.json();
  console.log('Check runs:', (data.check_runs || []).map(c => ({ name: c.name, status: c.status, conclusion: c.conclusion })));
}
checkRealSha();

