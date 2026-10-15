import { App } from '@capacitor/app';
import { Browser } from '@capacitor/browser';

// Any page that immediately redirects back into the app reproduces the bug, as long as the
// redirect comes back fast (see README). redirect-server.mjs answers with a plain 302 to the
// custom scheme, like an OAuth server ending a sign-in or sign-out.
const redirectUrl = (n) =>
  'http://localhost:8787/?to=' + encodeURIComponent(`capbrowserrepro://callback?open=${n}`);

const $ = (id) => document.getElementById(id);
let opens = 0;
let deepLinks = 0;

function log(line) {
  const t = new Date().toISOString().slice(11, 23);
  $('log').textContent += `${t}  ${line}\n`;
  console.log(`[repro] ${line}`);
  $('counts').textContent = `Browser.open() calls: ${opens}   appUrlOpen events: ${deepLinks}`;
}

// The app's deep-link handler: the flow is done, close the browser. A real app often does some
// work first (e.g. exchanging an OAuth code); the delay stands in for it.
App.addListener('appUrlOpen', async ({ url }) => {
  deepLinks++;
  log(`appUrlOpen #${deepLinks}  ${url}`);
  const delay = Number($('delay').value) || 0;
  if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
  await Browser.close();
  log('Browser.close() resolved');
});

$('open-redirect').addEventListener('click', async () => {
  opens++;
  // Numbered, so a second appUrlOpen carrying the same number is visibly a replay.
  const url = redirectUrl(opens);
  log(`Browser.open #${opens}  ${url}`);
  await Browser.open({ url });
  log(`Browser.open #${opens} resolved`);
});

$('open-plain').addEventListener('click', async () => {
  opens++;
  log(`Browser.open #${opens}  https://capacitorjs.com`);
  await Browser.open({ url: 'https://capacitorjs.com' });
  log(`Browser.open #${opens} resolved`);
});

$('clear').addEventListener('click', () => {
  opens = 0;
  deepLinks = 0;
  $('log').textContent = '';
  log('cleared');
});

log('ready');
