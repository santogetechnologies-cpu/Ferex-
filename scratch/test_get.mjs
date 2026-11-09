async function testGet() {
  const res = await fetch('https://education.ferexventures.com/api/create-order');
  console.log('GET Status:', res.status);
  console.log('Headers:', [...res.headers.entries()]);
  console.log('Body:', await res.text());
}
testGet();

