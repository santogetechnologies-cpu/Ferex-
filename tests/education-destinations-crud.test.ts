import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getWorkflowForCountry } from '../src/lib/api/countryWorkflows.ts';
import { getDocumentRequirements } from '../src/lib/api/documentRequirements.ts';

test('Workflow retrieval for newly injected countries (Lithuania, UK, Albania, Moldova)', () => {
  // Lithuania
  const ltWf = getWorkflowForCountry('Lithuania');
  assert.ok(ltWf);
  assert.ok(ltWf.authority_acronym.includes('SKVC'));
  assert.ok(ltWf.stages.length >= 5);
  assert.ok(ltWf.checklist_documents.some(d => d.name.includes('Apostille')));

  // UK
  const ukWf = getWorkflowForCountry('United Kingdom');
  assert.ok(ukWf);
  assert.equal(ukWf.authority_acronym, 'UKVI');
  assert.ok(ukWf.stages.some(s => s.short_name.includes('CAS')));

  // Albania
  const alWf = getWorkflowForCountry('Albania');
  assert.ok(alWf);
  assert.equal(alWf.authority_acronym, 'MEFA');
  assert.ok(alWf.stages.some(s => s.title.includes('E-Albania')));

  // Moldova
  const mdWf = getWorkflowForCountry('Moldova');
  assert.ok(mdWf);
  assert.ok(mdWf.authority_acronym.includes('GIM'));
  assert.ok(mdWf.stages.some(s => s.title.includes('Migration Department')));
});

test('Document requirements catalog for Lithuania, Albania, Moldova', async () => {
  // Lithuania
  const ltDocs = await getDocumentRequirements('Lithuania');
  assert.ok(ltDocs.length >= 4);
  assert.ok(ltDocs.some(d => d.document_name.includes('Apostille')));
  assert.ok(ltDocs.some(d => d.document_name.includes('Solvency')));

  // Albania
  const alDocs = await getDocumentRequirements('Albania');
  assert.ok(alDocs.length >= 3);
  assert.ok(alDocs.some(d => d.document_name.includes('Apostille')));

  // Moldova
  const mdDocs = await getDocumentRequirements('Moldova');
  assert.ok(mdDocs.length >= 3);
  assert.ok(mdDocs.some(d => d.document_name.includes('Migration')));
});
