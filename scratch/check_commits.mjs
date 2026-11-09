async function checkCommits() {
  const res = await fetch('https://api.github.com/repos/santogetechnologies-cpu/Ferex-/commits?per_page=5');
  const data = await res.json();
  console.log('Commits on GitHub:', (data || []).map(c => ({ sha: c.sha.slice(0, 7), msg: c.commit.message })));
}
checkCommits();

