async function checkBranch() {
  const res = await fetch('https://api.github.com/repos/santogetechnologies-cpu/Ferex-/deployments/7649755162');
  const data = await res.json();
  console.log('Deployment 7649755162 ref:', data.ref, 'task:', data.task);
}
checkBranch();

