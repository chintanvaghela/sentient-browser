import { SentientBrowser } from '../packages/sdk/dist/index.mjs';

async function runBenchmark() {
  console.log('🚀 Starting Sentient Browser Token Savings & Intent Benchmark...\n');

  // Launch browser via SDK
  const browser = await SentientBrowser.launch({ headless: true });
  const page = await browser.newPage();

  // Test page with dynamic interaction
  const testHtml = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>TechStore Checkout Portal</title>
        <style>
          body { font-family: system-ui; padding: 20px; background: #f8fafc; }
          .container { max-width: 600px; margin: 0 auto; background: white; padding: 24px; border-radius: 8px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); }
          .form-group { margin-bottom: 16px; display: flex; flex-direction: column; gap: 6px; }
          input { padding: 10px; border: 1px solid #cbd5e1; border-radius: 6px; }
          button { padding: 12px; background: #2563eb; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; }
          button:disabled { background: #94a3b8; cursor: not-allowed; }
          .modal { display: none; margin-top: 20px; padding: 16px; background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 6px; color: #065f46; }
        </style>
      </head>
      <body>
        <div class="wrapper noise-layer-1">
          <div class="container layout-card">
            <h1>TechStore Fast Checkout</h1>
            <p>Order Summary: 1x NVIDIA RTX 5080 ($999.00)</p>

            <div class="form-group">
              <label for="name">Full Name</label>
              <input id="name" type="text" placeholder="Jane Doe" />
            </div>

            <div class="form-group">
              <label for="address">Shipping Address</label>
              <input id="address" type="text" placeholder="123 AI Boulevard, Silicon Valley" />
            </div>

            <button id="order_btn" onclick="submitOrder()">Place Order ($999.00)</button>

            <div id="confirmation_modal" class="modal">
              <h3>Order Confirmed!</h3>
              <p>Receipt #AI-99482. Thank you for your purchase.</p>
            </div>
          </div>
        </div>

        <script>
          function submitOrder() {
            const btn = document.getElementById('order_btn');
            btn.disabled = true;
            btn.innerText = 'Processing Order...';

            setTimeout(() => {
              btn.style.display = 'none';
              const modal = document.getElementById('confirmation_modal');
              modal.style.display = 'block';
            }, 150);
          }
        </script>
      </body>
    </html>
  `;

  const dataUrl = `data:text/html;charset=utf-8,${encodeURIComponent(testHtml)}`;
  
  console.log('1. Navigating to checkout page and extracting Semantic DOM...');
  const snapshot = await page.goto(dataUrl);

  // Raw HTML vs Semantic DOM metrics
  const rawHtmlBytes = Buffer.byteLength(testHtml, 'utf8');
  const rawHtmlTokensEst = Math.round(testHtml.length / 3.8);

  const semanticJson = JSON.stringify(snapshot.nodes);
  const semanticTokensEst = Math.round(semanticJson.length / 3.8);

  console.log('\n📊 Baseline Token Metrics:');
  console.log(`• Raw HTML Size:     ${rawHtmlBytes} bytes (~${rawHtmlTokensEst} tokens)`);
  console.log(`• Semantic DOM Size: ${Buffer.byteLength(semanticJson, 'utf8')} bytes (~${semanticTokensEst} tokens)`);
  console.log(`• Token Reduction:   ${((1 - semanticTokensEst / rawHtmlTokensEst) * 100).toFixed(1)}% LESS TOKENS!`);

  console.log('\n2. Interactive Nodes Extracted by Sentient:');
  for (const node of snapshot.nodes) {
    if (node.clickable || node.tag === 'input' || node.role === 'button') {
      console.log(`  [${node.role.toUpperCase()}] id="${node.id}" text="${node.text || node.placeholder}"`);
    }
  }

  // Action 1: Fill shipping name
  console.log('\n3. Executing Intent: Fill Name input...');
  const diff1 = await page.fill('jane_doe_textbox', 'Antigravity Agent');
  console.log(diff1.compact);

  // Action 2: Click Place Order button
  console.log('\n4. Executing Intent: Click "place_order_99900_button"...');
  const diff2 = await page.click('place_order_99900_button');

  const diffTokensEst = Math.round(diff2.compact.length / 3.8);
  console.log(`\n📊 State Diff Emitted (Cost: only ~${diffTokensEst} tokens vs ${rawHtmlTokensEst} full HTML tokens!):`);
  console.log(diff2.compact);

  console.log('\n✅ Benchmark complete! All actions executed deterministically with native CDP input.');
  await browser.close();
}

runBenchmark().catch(console.error);
