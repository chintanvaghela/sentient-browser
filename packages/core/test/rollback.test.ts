import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { ChromiumManager, SentientPage } from '../src/browser/chromium.js';
import { ActionJournal } from '../src/intent/history.js';

describe('ActionJournal & Rollback Engine', () => {
  let manager: ChromiumManager;
  let page: SentientPage;

  beforeAll(async () => {
    manager = new ChromiumManager();
    await manager.launch({ headless: true });
    page = await manager.newPage();
  });

  afterAll(async () => {
    await manager.close();
  });

  it('correctly tracks action records in journal', () => {
    const journal = new ActionJournal({ maxHistory: 3 });

    journal.push({ id: '1', timestamp: 1, type: 'goto', urlBefore: 'http://a.com' });
    journal.push({ id: '2', timestamp: 2, type: 'click', target: 'btn1', urlBefore: 'http://a.com' });
    journal.push({ id: '3', timestamp: 3, type: 'fill', target: 'inp1', prevValue: 'old', urlBefore: 'http://a.com' });

    expect(journal.length).toBe(3);
    expect(journal.peek()?.type).toBe('fill');

    // Test max history overflow
    journal.push({ id: '4', timestamp: 4, type: 'click', target: 'btn2', urlBefore: 'http://a.com' });
    expect(journal.length).toBe(3);
    expect(journal.getAll()[0].id).toBe('2');

    const popped = journal.pop();
    expect(popped?.id).toBe('4');
    expect(journal.length).toBe(2);
  });

  it('restores previous input value on form rollback', async () => {
    const html = `
      <!DOCTYPE html>
      <html>
        <body>
          <input id="username" type="text" value="alice_initial" />
          <button id="submit_btn">Submit</button>
        </body>
      </html>
    `;
    await page.goto(`data:text/html,${encodeURIComponent(html)}`);

    const dom1 = await page.getSemanticDOM();
    const inputNode1 = dom1.nodes.find((n) => n.id.includes('username') || n.role === 'textbox');
    expect(inputNode1).toBeDefined();

    // 1. Fill with new value
    await page.fill(inputNode1!.id, 'bob_modified');
    const dom2 = await page.getSemanticDOM();
    const inputNode2 = dom2.nodes.find((n) => n.id === inputNode1!.id);
    expect(inputNode2?.value).toBe('bob_modified');

    // 2. Rollback the fill
    const diff = await page.rollback();
    expect(diff).toBeDefined();

    // Verify input value was restored to 'alice_initial'
    const dom3 = await page.getSemanticDOM();
    const inputNode3 = dom3.nodes.find((n) => n.id === inputNode1!.id);
    expect(inputNode3?.value).toBe('alice_initial');
  });

  it('dispatches Escape key on dialog/modal rollback', async () => {
    const html = `
      <!DOCTYPE html>
      <html>
        <body>
          <button id="open_dialog_btn" onclick="document.getElementById('my_modal').showModal()">Open</button>
          <dialog id="my_modal">
            <p>Modal content</p>
          </dialog>
        </body>
      </html>
    `;
    await page.goto(`data:text/html,${encodeURIComponent(html)}`);

    const dom1 = await page.getSemanticDOM();
    const btnNode = dom1.nodes.find((n) => n.role === 'button');
    expect(btnNode).toBeDefined();

    // Click open
    await page.click(btnNode!.id);

    // Rollback click should dispatch escape and close dialog
    await page.rollback();

    const isClosed = await page.page.evaluate(() => {
      const dialog = document.getElementById('my_modal') as HTMLDialogElement;
      return !dialog || !dialog.open;
    });
    expect(isClosed).toBe(true);
  });
});
