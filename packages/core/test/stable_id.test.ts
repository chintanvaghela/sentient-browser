import { describe, it, expect } from 'vitest';
import { generateStableId, slugify } from '../src/semantic/stable_id.js';

describe('Stable ID Generator', () => {
  it('slugifies basic text properly', () => {
    expect(slugify('  Log In to Your Account!  ')).toBe('log_in_to_your_account');
    expect(slugify('Proceed to Checkout ($49.99)')).toBe('proceed_to_checkout_4999');
  });

  it('generates deterministic stable id from text and role', () => {
    const id1 = generateStableId({
      role: 'button',
      text: 'Submit Order'
    });
    expect(id1).toBe('submit_order_button');

    // Identical input produces identical output
    const id2 = generateStableId({
      role: 'button',
      text: 'Submit Order'
    });
    expect(id2).toBe(id1);
  });

  it('avoids duplicate role suffixes when role is already in text', () => {
    const id = generateStableId({
      role: 'button',
      text: 'Login Button'
    });
    expect(id).toBe('login_button');
  });

  it('prioritizes explicit testId attributes', () => {
    const id = generateStableId({
      role: 'button',
      text: 'Click here',
      testId: 'qa-checkout-btn'
    });
    expect(id).toBe('qa_checkout_btn');
  });

  it('handles disambiguation index for repeated elements', () => {
    const item1 = generateStableId({
      role: 'button',
      text: 'Add to Cart',
      disambiguationIndex: 1
    });
    const item2 = generateStableId({
      role: 'button',
      text: 'Add to Cart',
      disambiguationIndex: 2
    });

    expect(item1).toBe('add_to_cart_button');
    expect(item2).toBe('add_to_cart_button_2');
  });

  it('scopes IDs with parent context slug', () => {
    const id = generateStableId({
      role: 'textbox',
      placeholder: 'Email',
      parentSlug: 'login_form'
    });
    expect(id).toBe('login_form__email_textbox');
  });
});
