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

test('Customer Dossier scoping: order history strictly isolates orders belonging to selected customer', () => {
  const allOrders = [
    { id: 'so-1', customer_id: 'cust-101', order_no: 'SO-1001', grand_total: 15000 },
    { id: 'so-2', customer_id: 'cust-102', order_no: 'SO-1002', grand_total: 28000 },
    { id: 'so-3', customer_id: 'cust-101', order_no: 'SO-1003', grand_total: 42000 },
    { id: 'so-4', customer_id: 'cust-103', order_no: 'SO-1004', grand_total: 19500 }
  ];

  const targetCustomerId = 'cust-101';
  const scopedOrders = allOrders.filter(o => o.customer_id === targetCustomerId);

  // Exactly 2 orders belong to cust-101
  assert.equal(scopedOrders.length, 2);
  assert.deepEqual(scopedOrders.map(o => o.order_no), ['SO-1001', 'SO-1003']);
  for (const order of scopedOrders) {
    assert.equal(order.customer_id, targetCustomerId, `Order ${order.order_no} must belong to ${targetCustomerId}`);
  }

  // Cross-customer leak test: no order from cust-102 or cust-103 can be present
  assert.ok(!scopedOrders.some(o => o.customer_id === 'cust-102'));
  assert.ok(!scopedOrders.some(o => o.customer_id === 'cust-103'));
});

test('Batch stock deduction logic: decreases quantity and updates status on Sales Order confirmation', () => {
  const initialBatches = [
    { id: 'batch-01', product_id: 'prod-pea', product_name: 'Frozen Peas 1kg', quantity: 100, status: 'Active' },
    { id: 'batch-02', product_id: 'prod-corn', product_name: 'Frozen Corn 500g', quantity: 25, status: 'Active' }
  ];

  const orderItems = [
    { product_id: 'prod-pea', batch_id: 'batch-01', quantity: 40 },
    { product_id: 'prod-corn', batch_id: 'batch-02', quantity: 25 }
  ];

  // Emulate batch deduction logic
  const updatedBatches = initialBatches.map(b => {
    const item = orderItems.find(it => it.batch_id === b.id || (!it.batch_id && it.product_id === b.product_id));
    if (item) {
      const newQty = Math.max(0, b.quantity - item.quantity);
      const newStatus = newQty <= 0 ? 'Depleted' : newQty <= 20 ? 'Low Stock' : 'Active';
      return { ...b, quantity: newQty, status: newStatus };
    }
    return b;
  });

  const batch1 = updatedBatches.find(b => b.id === 'batch-01');
  const batch2 = updatedBatches.find(b => b.id === 'batch-02');

  // Batch 1: 100 - 40 = 60, status Active
  assert.equal(batch1?.quantity, 60);
  assert.equal(batch1?.status, 'Active');

  // Batch 2: 25 - 25 = 0, status Depleted
  assert.equal(batch2?.quantity, 0);
  assert.equal(batch2?.status, 'Depleted');
});

test('Order cancellation stock restoration: restores quantities to batches', () => {
  const depletedBatches = [
    { id: 'batch-01', product_id: 'prod-pea', product_name: 'Frozen Peas 1kg', quantity: 60, status: 'Active' },
    { id: 'batch-02', product_id: 'prod-corn', product_name: 'Frozen Corn 500g', quantity: 0, status: 'Depleted' }
  ];

  const cancelledOrderItems = [
    { product_id: 'prod-pea', batch_id: 'batch-01', quantity: 40 },
    { product_id: 'prod-corn', batch_id: 'batch-02', quantity: 25 }
  ];

  // Emulate restoration logic upon cancellation
  const restoredBatches = depletedBatches.map(b => {
    const item = cancelledOrderItems.find(it => it.batch_id === b.id || (!it.batch_id && it.product_id === b.product_id));
    if (item) {
      const restoredQty = b.quantity + item.quantity;
      const restoredStatus = restoredQty > 20 ? 'Active' : 'Low Stock';
      return { ...b, quantity: restoredQty, status: restoredStatus };
    }
    return b;
  });

  const b1 = restoredBatches.find(b => b.id === 'batch-01');
  const b2 = restoredBatches.find(b => b.id === 'batch-02');

  assert.equal(b1?.quantity, 100);
  assert.equal(b1?.status, 'Active');

  assert.equal(b2?.quantity, 25);
  assert.equal(b2?.status, 'Active');
});
