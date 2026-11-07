import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { buildLifecycleRules } from '../lib/lifecycle.mjs';
import { createR2Client } from '../lib/r2.mjs';

describe('buildLifecycleRules', () => {
  it('creates 4 enabled prefix rules for alfa and beta and never includes production', () => {
    const rules = buildLifecycleRules(['agenda-de-boteco', 'agenda-de-boteco-client'], 30);
    assert.equal(rules.length, 4);
    assert.deepEqual(
      rules.map((r) => ({
        ID: r.ID,
        Prefix: r.Filter?.Prefix,
        Days: r.Expiration?.Days,
        Status: r.Status,
      })),
      [
        {
          ID: 'expire-agenda-de-boteco-alfa',
          Prefix: 'ota/agenda-de-boteco/alfa/',
          Days: 30,
          Status: 'Enabled',
        },
        {
          ID: 'expire-agenda-de-boteco-beta',
          Prefix: 'ota/agenda-de-boteco/beta/',
          Days: 30,
          Status: 'Enabled',
        },
        {
          ID: 'expire-agenda-de-boteco-client-alfa',
          Prefix: 'ota/agenda-de-boteco-client/alfa/',
          Days: 30,
          Status: 'Enabled',
        },
        {
          ID: 'expire-agenda-de-boteco-client-beta',
          Prefix: 'ota/agenda-de-boteco-client/beta/',
          Days: 30,
          Status: 'Enabled',
        },
      ],
    );
    for (const rule of rules) {
      assert.ok(rule.Filter?.Prefix?.endsWith('/'));
      assert.equal(rule.Filter?.Prefix?.includes('production'), false);
    }
  });
});

describe('createR2Client', () => {
  it('throws when required R2 env vars are missing without echoing values', () => {
    assert.throws(
      () =>
        createR2Client({
          R2_ACCOUNT_ID: 'acc123',
          R2_ACCESS_KEY_ID: 'SECRET_KEY_ID_VALUE',
        }),
      (err) => {
        assert.ok(err instanceof Error);
        assert.match(err.message, /R2_SECRET_ACCESS_KEY/);
        assert.equal(err.message.includes('SECRET_KEY_ID_VALUE'), false);
        return true;
      },
    );
  });
});
