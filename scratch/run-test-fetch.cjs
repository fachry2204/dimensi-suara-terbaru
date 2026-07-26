const { testSoundOnHttpFetch, checkReleaseHttpFetch } = require('../src/lib/soundon/http-fetch.ts');

async function test() {
  console.log("Testing testSoundOnHttpFetch...");
  const res = await testSoundOnHttpFetch();
  console.log("Result:", res);
}

test().catch(console.error);
