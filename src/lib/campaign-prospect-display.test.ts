import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { prospectDisplayText } from './campaign-prospect-display';

test('producer descriptions omit form and click ingestion labels, preserving business text', () => {
  assert.equal(prospectDisplayText('[Laney-Barrac (Brevo)] Importateur UK'), 'Importateur UK');
  assert.equal(prospectDisplayText('[Laney-Barrac (Tally)] Importateur UK'), 'Importateur UK');
  assert.equal(prospectDisplayText('[Formulaire] Demande de tarifs'), 'Demande de tarifs');
  assert.equal(prospectDisplayText('Importateur de vins [bio]'), 'Importateur de vins [bio]');
});