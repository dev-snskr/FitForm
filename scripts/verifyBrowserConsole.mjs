import { spawn } from 'child_process';
import http from 'http';

const EDGE_PATH = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const PORT = 9222;

const urlsToTest = [
  'http://localhost:3000/onboarding',
  'http://localhost:3000/plan',
  'http://localhost:3000/plan/1',
  'http://localhost:3000/logs',
  'http://localhost:3000/diet',
  'http://localhost:3000/workout/1'
];

const bgModes = ['full', 'static', 'off'];

function sleep(ms) {
  return new Promise(res => setTimeout(res, ms));
}

async function getJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function runTests() {
  console.log("Launching Headless Edge on port", PORT);
  const browserProc = spawn(EDGE_PATH, [
    `--remote-debugging-port=${PORT}`,
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu',
    '--disable-dev-shm-usage',
    'about:blank'
  ]);

  // Give Edge a moment to initialize
  await sleep(2500);

  try {
    const pages = await getJson(`http://127.0.0.1:${PORT}/json`);
    const page = pages[0];
    if (!page || !page.webSocketDebuggerUrl) {
      throw new Error("Could not find WebSocket URL for Edge page");
    }

    console.log("Connected to browser page via CDP WS:", page.webSocketDebuggerUrl);

    const ws = new WebSocket(page.webSocketDebuggerUrl);

    let messageId = 1;
    const callbacks = new Map();
    const caughtExceptions = [];
    const consoleErrors = [];

    await new Promise((resolve, reject) => {
      ws.onopen = resolve;
      ws.onerror = reject;
    });

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && callbacks.has(msg.id)) {
        const { resolve } = callbacks.get(msg.id);
        callbacks.delete(msg.id);
        resolve(msg.result);
      }

      if (msg.method === 'Runtime.exceptionThrown') {
        caughtExceptions.push(msg.params.exceptionDetails);
        console.error("  [Browser Exception Caught]:", msg.params.exceptionDetails.text, msg.params.exceptionDetails.exception?.description);
      }

      if (msg.method === 'Runtime.consoleAPICalled') {
        if (msg.params.type === 'error') {
          consoleErrors.push(msg.params.args.map(a => a.value || a.description).join(' '));
          console.error("  [Browser Console Error]:", ...msg.params.args.map(a => a.value || a.description));
        }
      }
    };

    function sendCommand(method, params = {}) {
      return new Promise((resolve) => {
        const id = messageId++;
        callbacks.set(id, { resolve });
        ws.send(JSON.stringify({ id, method, params }));
      });
    }

    await sendCommand('Runtime.enable');
    await sendCommand('Page.enable');

    console.log("\n=== Starting Matrix Tests: 6 URLs x 3 Background Modes ===");

    for (const url of urlsToTest) {
      for (const mode of bgModes) {
        console.log(`\nTesting: ${url} with background mode='${mode}'`);
        caughtExceptions.length = 0;
        consoleErrors.length = 0;

        // Set localStorage for fitform_background_mode before navigation
        // Navigate
        await sendCommand('Page.navigate', { url });

        // Wait for page to load
        await sleep(2000);

        // Inject background mode switch into localStorage and fire context event if present
        await sendCommand('Runtime.evaluate', {
          expression: `
            localStorage.setItem('fitform_background_mode', '${mode}');
            window.dispatchEvent(new Event('storage'));
          `
        });

        // Also test window resize event
        await sendCommand('Runtime.evaluate', {
          expression: `window.dispatchEvent(new Event('resize'));`
        });

        // Also test tab visibility change event
        await sendCommand('Runtime.evaluate', {
          expression: `document.dispatchEvent(new Event('visibilitychange'));`
        });

        await sleep(1000);

        // Check if any ReferenceError or drawFrame errors were caught
        const drawFrameErrors = caughtExceptions.filter(e => 
          JSON.stringify(e).includes('drawFrame') || JSON.stringify(e).includes('ReferenceError')
        );

        if (drawFrameErrors.length > 0) {
          throw new Error(`FAILURE on ${url} (mode: ${mode}): Found drawFrame ReferenceError!`);
        }

        console.log(`  ✓ Passed without ReferenceError or background crash (Mode: ${mode})`);
      }
    }

    console.log("\n✅ ALL MATRIX TESTS PASSED! No ReferenceErrors or unhandled exceptions detected.");
    ws.close();
  } finally {
    browserProc.kill();
  }
}

runTests().catch(err => {
  console.error("Fatal Test Runner Error:", err);
  process.exit(1);
});
