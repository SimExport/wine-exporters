import { describe, test } from 'node:test';
import { strict as assert } from 'node:assert';
import { addImporterToCrm, type CrmClient } from './importer-crm';

interface MockConfig {
  container?: { id: string } | null;
  containerError?: unknown;
  dupByContact?: { id: string } | null;
  dupByEmail?: { id: string } | null;
  stage?: { id: string } | null;
  insertError?: unknown;
}

interface RecordedCall {
  table: string;
  filters: Record<string, unknown>;
  insert?: Record<string, unknown>;
}

function makeClient(config: MockConfig) {
  const calls: RecordedCall[] = [];
  const client: CrmClient = {
    from: (table: string) => {
      const call: RecordedCall = { table, filters: {} };
      calls.push(call);
      const builder: any = {
        select: () => builder,
        eq: (key: string, value: unknown) => { call.filters[key] = value; return builder; },
        ilike: (key: string, value: unknown) => { call.filters[`ilike:${key}`] = value; return builder; },
        order: () => builder,
        limit: () => builder,
        maybeSingle: async () => {
          if (table === 'campaigns') return { data: config.container ?? null, error: config.containerError ?? null };
          if (table === 'pipeline_stages') return { data: config.stage ?? null, error: null };
          if ('buyer_contact_id' in call.filters) return { data: config.dupByContact ?? null, error: null };
          return { data: config.dupByEmail ?? null, error: null };
        },
        insert: async (row: Record<string, unknown>) => {
          call.insert = row;
          return { error: config.insertError ?? null };
        },
      };
      return builder;
    },
  };
  return { client, calls };
}

const CONTACT = {
  id: '03c66a37-6445-4f1f-820e-321d80ae91a8',
  company_name: 'Weine W. Wuttke GmbH & Co. KG',
  country: 'Germany',
  email: 'Info@Wuttke.example',
  phone: '+49 40 000000',
  website_url: 'https://www.wuttke.example',
  street: 'Musterstrasse 1',
  city: 'Hamburg',
  postal_code: '20095',
};

describe('addImporterToCrm', () => {
  test('inserts stored contact data into the existing manual container with the first stage', async () => {
    const { client, calls } = makeClient({ container: { id: 'camp-1' }, stage: { id: 'stage-1' } });
    const result = await addImporterToCrm(client, 'user-1', CONTACT);
    assert.equal(result, 'added');
    const insert = calls.find(c => c.table === 'leads' && c.insert)?.insert;
    assert.ok(insert, 'a lead must be inserted');
    assert.equal(insert!.campaign_id, 'camp-1');
    assert.equal(insert!.buyer_contact_id, CONTACT.id);
    assert.equal(insert!.source, 'manual');
    assert.equal(insert!.prospect_status, 'new');
    assert.equal(insert!.stage_id, 'stage-1');
    assert.equal(insert!.buyer_id, 'info@wuttke.example');
    assert.equal(insert!.market, 'Germany');
    assert.equal(insert!.created_by, 'user-1');
    assert.equal(insert!.first_name, undefined);
    assert.equal(insert!.last_name, undefined);
    // No campaign write of any kind.
    assert.ok(!calls.some(c => c.table === 'campaigns' && c.insert), 'campaigns must never be written');
    // The container lookup targets the current user's manual container only.
    const containerQuery = calls.find(c => c.table === 'campaigns');
    assert.equal(containerQuery?.filters.user_id, 'user-1');
    assert.equal(containerQuery?.filters.name, 'Prospects manuels');
    assert.equal(containerQuery?.filters.status, 'manual');
  });

  test('stage_id stays null when the owner has no pipeline stage', async () => {
    const { client, calls } = makeClient({ container: { id: 'camp-1' }, stage: null });
    const result = await addImporterToCrm(client, 'user-1', CONTACT);
    assert.equal(result, 'added');
    const insert = calls.find(c => c.table === 'leads' && c.insert)?.insert;
    assert.equal(insert!.stage_id, null);
  });

  test('detects a duplicate by buyer_contact_id across any owner container and inserts nothing', async () => {
    const { client, calls } = makeClient({ container: { id: 'camp-1' }, dupByContact: { id: 'lead-1' } });
    const result = await addImporterToCrm(client, 'user-1', CONTACT);
    assert.equal(result, 'duplicate');
    assert.ok(!calls.some(c => c.insert), 'no insert on duplicate');
    const dupQuery = calls.find(c => c.table === 'leads');
    assert.equal(dupQuery?.filters['campaigns.user_id'], 'user-1');
  });

  test('detects a duplicate by normalized email when buyer_contact_id is unknown', async () => {
    const { client, calls } = makeClient({ container: { id: 'camp-1' }, dupByEmail: { id: 'lead-2' } });
    const result = await addImporterToCrm(client, 'user-1', CONTACT);
    assert.equal(result, 'duplicate');
    assert.ok(!calls.some(c => c.insert));
    const emailQuery = calls.filter(c => c.table === 'leads')[1];
    assert.equal(emailQuery?.filters['ilike:email'], 'info@wuttke.example');
  });

  test('skips the email duplicate check when the contact has no email', async () => {
    const { client, calls } = makeClient({ container: { id: 'camp-1' } });
    const result = await addImporterToCrm(client, 'user-1', { ...CONTACT, email: null });
    assert.equal(result, 'added');
    assert.ok(!calls.some(c => 'ilike:email' in c.filters));
    const insert = calls.find(c => c.table === 'leads' && c.insert)?.insert;
    assert.equal(insert!.buyer_id, 'unknown');
    assert.equal(insert!.email, null);
  });

  test('returns no-container when the manual container is absent and inserts nothing', async () => {
    const { client, calls } = makeClient({ container: null });
    const result = await addImporterToCrm(client, 'user-1', CONTACT);
    assert.equal(result, 'no-container');
    assert.ok(!calls.some(c => c.table === 'leads'), 'no lead read or write without a container');
    assert.ok(!calls.some(c => c.table === 'campaigns' && c.insert), 'the container is never created here');
  });

  test('returns no-container when the container read is refused', async () => {
    const { client, calls } = makeClient({ containerError: { code: '42501' } });
    const result = await addImporterToCrm(client, 'user-1', CONTACT);
    assert.equal(result, 'no-container');
    assert.ok(!calls.some(c => c.insert));
  });

  test('surfaces an insert refusal (RLS/network) as error without claiming success', async () => {
    const { client } = makeClient({ container: { id: 'camp-1' }, insertError: { code: '42501' } });
    const result = await addImporterToCrm(client, 'user-1', CONTACT);
    assert.equal(result, 'error');
  });
});
