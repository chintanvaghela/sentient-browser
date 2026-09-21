import { SentientBrowser } from '../packages/sdk/dist/index.mjs';

async function auditSprintDesk() {
  console.log('⚡ Launching Sentient Browser...');
  const browser = await SentientBrowser.launch({ headless: true });
  const page = await browser.newPage();

  const startNav = Date.now();
  console.log('🌐 Navigating to https://sprint-desk.com and awaiting multi-signal settlement...');
  const snapshot = await page.goto('https://sprint-desk.com');
  const navTime = Date.now() - startNav;

  console.log('\n================ PAGE OVERVIEW ================');
  console.log(`Title: ${snapshot.title}`);
  console.log(`URL:   ${snapshot.url}`);
  console.log(`Deterministic Settlement Latency: ${navTime}ms`);
  console.log(`Semantic DOM Total Nodes:         ${snapshot.totalNodes}`);
  console.log(`Interactive Action Targets:       ${snapshot.interactiveCount}`);

  console.log('\n================ HEADINGS & STRUCTURE ================');
  const summary = await page.getSummary();
  summary.headings.forEach((h, i) => console.log(`  H${i + 1}: ${h}`));

  console.log('\n================ INTERACTIVE ACTION TARGETS ================');
  const buttons = snapshot.nodes.filter((n) => n.role === 'button');
  const links = snapshot.nodes.filter((n) => n.role === 'link');
  const inputs = snapshot.nodes.filter((n) => n.role === 'textbox');

  console.log(`\n• Buttons (${buttons.length}):`);
  buttons.forEach((b) => console.log(`  [id: ${b.id.padEnd(35)}] text: "${b.text || '(icon/theme)'}"`));

  console.log(`\n• Navigation & Action Links (${links.length}):`);
  links.forEach((l) => console.log(`  [id: ${l.id.padEnd(35)}] text: "${l.text}"`));

  console.log('\n================ TESTING AGENT INTENT INTERACTIONS ================');

  // 1. Click "Time Tracker" tab
  console.log('\n1. Clicking Tab "time_tracker_button"...');
  const diff1 = await page.click('time_tracker_button');
  console.log('   Diff:');
  console.log('   ' + diff1.compact.split('\n').join('\n   '));

  // 2. Click "Attendance & Leave" tab
  console.log('\n2. Clicking Tab "attendance_leave_button"...');
  const diff2 = await page.click('attendance_leave_button');
  console.log('   Diff:');
  console.log('   ' + diff2.compact.split('\n').join('\n   '));

  // 3. Click FAQ Accordion: "how_does_the_30_day_free_tri_button"
  console.log('\n3. Clicking FAQ Accordion "how_does_the_30_day_free_tri_button"...');
  const diff3 = await page.click('how_does_the_30_day_free_tri_button');
  console.log('   Diff:');
  console.log('   ' + diff3.compact.split('\n').join('\n   '));

  await browser.close();
  console.log('\n✓ Full SprintDesk Sentient audit completed successfully!');
}

auditSprintDesk().catch(console.error);
