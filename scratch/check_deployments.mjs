async function checkDeployments() {
  try {
    const res = await fetch('https://api.github.com/repos/santogetechnologies-cpu/Ferex-/deployments');
    const data = await res.json();
    console.log('Deployments:', (data || []).slice(0, 3).map(d => ({
      id: d.id,
      environment: d.environment,
      created_at: d.created_at,
      sha: d.sha
    })));
  } catch (err) {
    console.error('Error fetching deployments:', err);
  }
}
checkDeployments();

