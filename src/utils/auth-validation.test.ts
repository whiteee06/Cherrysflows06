/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateEmail,
  validatePassword,
  validatePasswordMatch,
  validateFullName,
} from './auth-validation';

test('validateEmail correctly accepts valid email addresses and rejects invalid formats', () => {
  assert.equal(validateEmail('test@cherryflow.dev').isValid, true);
  assert.equal(validateEmail('user.name+tag@sub.domain.co').isValid, true);
  assert.equal(validateEmail('').isValid, false);
  assert.equal(validateEmail('invalid-email').isValid, false);
  assert.equal(validateEmail('missing-domain@').isValid, false);
  assert.equal(validateEmail('@missing-user.com').isValid, false);
});

test('validatePassword enforces 8 character minimum and evaluates strength', () => {
  const shortResult = validatePassword('short');
  assert.equal(shortResult.isValid, false);
  assert.equal(shortResult.meetsLength, false);

  const validResult = validatePassword('SuperSecret123!');
  assert.equal(validResult.isValid, true);
  assert.equal(validResult.meetsLength, true);
  assert.equal(validResult.hasNumber, true);
  assert.equal(validResult.hasSpecialChar, true);
  assert.equal(validResult.strength, 'strong');

  const mediumResult = validatePassword('password123');
  assert.equal(mediumResult.isValid, true);
  assert.equal(mediumResult.strength, 'medium');
});

test('validatePasswordMatch checks that both fields match precisely', () => {
  assert.equal(validatePasswordMatch('password123', 'password123').isValid, true);
  assert.equal(validatePasswordMatch('password123', 'differentPassword').isValid, false);
  assert.equal(validatePasswordMatch('password123', '').isValid, false);
});

test('validateFullName enforces minimum length and constraints', () => {
  assert.equal(validateFullName('Nithiarasu').isValid, true);
  assert.equal(validateFullName('A').isValid, false);
  assert.equal(validateFullName('   ').isValid, false);
});
