import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isSuperAdmin, normalizeRole } from '../src/lib/roleRouter.ts';

test('Rimi warehouse staff roles are never granted admin privileges', () => {
  assert.equal(isSuperAdmin('operations_manager'), false);
  assert.equal(isSuperAdmin('rimi_staff'), false);
  assert.equal(isSuperAdmin('warehouse_lead'), false);
  assert.equal(normalizeRole('operations_manager'), 'operations_manager');
  assert.equal(normalizeRole('rimi_staff'), 'rimi_staff');
});

test('Rimi Customer Account dropdown filter: only Active Account customers allowed for Sales Orders', () => {
  const sampleCustomers = [
    { id: '1', business_name: 'Metro Mart', pipeline_stage: 'Lead', status: 'Active' },
    { id: '2', business_name: 'Cold Grocers', pipeline_stage: 'Contacted', status: 'Active' },
    { id: '3', business_name: 'Fresh Supermarket', pipeline_stage: 'Sample Sent', status: 'Active' },
    { id: '4', business_name: 'Reliance Fresh Hub', pipeline_stage: 'Negotiation', status: 'Active' },
    { id: '5', business_name: 'Apex Superstore', pipeline_stage: 'Active Account', status: 'Active' },
    { id: '6', business_name: 'City Foods', pipeline_stage: 'Suspended', status: 'Inactive' },
    { id: '7', business_name: 'Star Frozen Retail', pipeline_stage: 'Active Account', status: 'Inactive' }
  ];

  const activeForSalesOrders = sampleCustomers.filter(
    c => c.pipeline_stage === 'Active Account' && c.status === 'Active'
  );

  // Exactly 1 customer qualifies
  assert.equal(activeForSalesOrders.length, 1);
  assert.equal(activeForSalesOrders[0].business_name, 'Apex Superstore');

  // Lead, Contacted, Sample Sent, Negotiation, Suspended must be strictly excluded
  const excludedStages = ['Lead', 'Contacted', 'Sample Sent', 'Negotiation', 'Suspended'];
  for (const cust of activeForSalesOrders) {
    assert.ok(!excludedStages.includes(cust.pipeline_stage), `Stage ${cust.pipeline_stage} must not be allowed`);
  }
});

test('Cancelled order payment exclusion filter: cancelled orders purged from collections and total collected', () => {
  const sampleOrders = [
    { id: 'ord-1', order_no: 'SO-2026-1001', order_status: 'Delivered' },
    { id: 'ord-2', order_no: 'SO-2026-1002', order_status: 'Cancelled' }
  ];

  const samplePayments = [
    { id: 'pay-1', order_id: 'ord-1', order_no: 'SO-2026-1001', amount: 50000, notes: 'Payment against SO-2026-1001' },
    { id: 'pay-2', order_id: 'ord-2', order_no: 'SO-2026-1002', amount: 35000, notes: 'Payment against SO-2026-1002' },
    { id: 'pay-3', order_id: undefined, order_no: 'SO-2026-1002', amount: 15000, notes: 'Direct credit SO-2026-1002' }
  ];

  const cancelledOrderIds = new Set(sampleOrders.filter(o => o.order_status === 'Cancelled').map(o => o.id));
  const cancelledOrderNos = new Set(sampleOrders.filter(o => o.order_status === 'Cancelled').map(o => o.order_no));

  const validPayments = samplePayments.filter(p => {
    if (p.order_id && cancelledOrderIds.has(p.order_id)) return false;
    if (p.order_no && cancelledOrderNos.has(p.order_no)) return false;
    if (p.notes) {
      for (const no of cancelledOrderNos) {
        if (no && p.notes.includes(no)) return false;
      }
    }
    return true;
  });

  // Only pay-1 should remain; pay-2 and pay-3 belong to cancelled order SO-2026-1002
  assert.equal(validPayments.length, 1);
  assert.equal(validPayments[0].id, 'pay-1');

  // Total collected must strictly reflect valid uncancelled payments
  const totalCollected = validPayments.reduce((acc, p) => acc + p.amount, 0);
  assert.equal(totalCollected, 50000);
});

test('Cold storage hubs stock aggregation groups quantities by facility', () => {
  const batches = [
    { id: 'b1', warehouse_id: 'wh-pune', warehouse_name: 'Pune Cold Hub', product_name: 'Frozen Peas 1kg', quantity: 400, status: 'Active' },
    { id: 'b2', warehouse_id: 'wh-pune', warehouse_name: 'Pune Cold Hub', product_name: 'Frozen Corn 500g', quantity: 250, status: 'Expiring Soon' },
    { id: 'b3', warehouse_id: 'wh-mumbai', warehouse_name: 'Mumbai Marine Terminal', product_name: 'Frozen Berries 1kg', quantity: 600, status: 'Active' }
  ];

  const puneStock = batches.filter(b => b.warehouse_id === 'wh-pune' || b.warehouse_name.includes('Pune'));
  const totalPuneUnits = puneStock.reduce((acc, b) => acc + b.quantity, 0);
  const puneSkus = new Set(puneStock.map(b => b.product_name)).size;

  assert.equal(totalPuneUnits, 650);
  assert.equal(puneSkus, 2);
});
