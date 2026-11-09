async function checkGithub() {
  try {
    const res = await fetch('https://api.github.com/repos/santogetechnologies-cpu/Ferex-/commits/main');
    const data = await res.json();
    console.log('GitHub latest commit on main:', data.sha, data.commit?.message);
  } catch (err) {
    console.error('Error fetching github:', err);
  }
}
checkGithub();

