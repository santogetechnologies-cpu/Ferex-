async function check5498() {
  const res = await fetch('https://api.github.com/repos/santogetechnologies-cpu/Ferex-/commits/5498bc9f20e4026daff12be9862804b3cf4ba382/check-runs');
  const data = await res.json();
  console.log('Check runs for 5498bc9:', data);
}
check5498();

