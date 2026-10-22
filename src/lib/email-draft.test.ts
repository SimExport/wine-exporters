import { describe, test } from 'node:test';
import { strict as assert } from 'node:assert';
import { contentFromDraft, draftFromContent, draftKey, draftProblems, hasAdjacentImages, insertBlock, moveBlock, removeBlock, type DraftBlock } from './email-draft';

const t = (id: string): DraftBlock => ({ id, type: 'text', html: `<p>${id}</p>` });
const img = (id: string): DraftBlock => ({ id, type: 'image', url: 'https://x/' + id, alt: '' });

describe('email draft blocks', () => {
  test('move up/down and bounds', () => {
    const b = [t('a'), t('b'), t('c')];
    assert.deepEqual(moveBlock(b, 0, 1).map((x) => x.id), ['b', 'a', 'c']);
    assert.deepEqual(moveBlock(b, 2, -1).map((x) => x.id), ['a', 'c', 'b']);
    assert.equal(moveBlock(b, 0, -1), b);
  });
  test('remove and insert after index', () => {
    assert.deepEqual(removeBlock([t('a'), t('b')], 'a').map((x) => x.id), ['b']);
    assert.deepEqual(insertBlock([t('a'), t('b')], t('n'), 0).map((x) => x.id), ['a', 'n', 'b']);
  });
  test('subject prefix is protected and restored', () => {
    const d = draftFromContent({ version: 2, subject: '{{ contact.COMPANY_NAME }} hello', cta_label: 'X', blocks: [t('a')] })!;
    assert.equal(d.subject, 'hello');
    assert.equal(contentFromDraft(d).subject, '{{ contact.COMPANY_NAME }} hello');
  });
  test('problems: empty subject, no text, more than 3 images', () => {
    assert.deepEqual(draftProblems({ subject: '', cta_label: 'x', blocks: [img('1'), img('2'), img('3'), img('4')] }), ['subject', 'text', 'images']);
    assert.deepEqual(draftProblems({ subject: 's', cta_label: 'x', blocks: [t('a')] }), []);
  });
  test('dirty detection and adjacent images', () => {
    const d = { subject: 's', cta_label: 'x', blocks: [t('a')] };
    assert.notEqual(draftKey(d), draftKey({ ...d, subject: 's2' }));
    assert.equal(hasAdjacentImages([img('1'), img('2')]), true);
    assert.equal(hasAdjacentImages([img('1'), t('a'), img('2')]), false);
  });
  test('legacy or empty content yields no draft', () => {
    assert.equal(draftFromContent(null), null);
    assert.equal(draftFromContent({ version: 1, blocks: [] }), null);
  });
});
