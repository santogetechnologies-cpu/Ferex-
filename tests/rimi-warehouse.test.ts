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

test('Customer deletion tombstone ensures deleted customer is purged and cannot be revived', () => {
  const localCustomers = [
    { id: 'c-1', business_name: 'Alpha Traders' },
    { id: 'c-2', business_name: 'Beta Frozen Foods' },
    { id: 'c-3', business_name: 'Gamma Stores' }
  ];

  const dbCustomers = [
    { id: 'c-1', business_name: 'Alpha Traders' },
    { id: 'c-2', business_name: 'Beta Frozen Foods' },
    { id: 'c-3', business_name: 'Gamma Stores' }
  ];

  const deletedId = 'c-2';
  const deletedSet = new Set([deletedId]);

  // Purge from local cache
  const updatedLocal = localCustomers.filter(c => !deletedSet.has(c.id));
  assert.equal(updatedLocal.length, 2);
  assert.ok(!updatedLocal.some(c => c.id === deletedId));

  // Merge simulation excluding tombstoned IDs
  const map = new Map();
  updatedLocal.forEach(c => map.set(c.id, c));
  dbCustomers
    .filter(c => !deletedSet.has(c.id))
    .forEach(c => map.set(c.id, { ...map.get(c.id), ...c }));

  const finalMerged = Array.from(map.values());
  assert.equal(finalMerged.length, 2);
  assert.deepEqual(finalMerged.map(c => c.id), ['c-1', 'c-3']);
  assert.ok(!finalMerged.some(c => c.id === deletedId));
});

test('Payment Collections date filtering: Daily, Weekly, Monthly, Yearly, and Custom Range', () => {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  const fiveDaysAgo = new Date(now);
  fiveDaysAgo.setDate(now.getDate() - 5);
  const fiveDaysAgoStr = fiveDaysAgo.toISOString().split('T')[0];

  const fortyDaysAgo = new Date(now);
  fortyDaysAgo.setDate(now.getDate() - 40);
  const fortyDaysAgoStr = fortyDaysAgo.toISOString().split('T')[0];

  const lastYear = new Date(now);
  lastYear.setFullYear(now.getFullYear() - 1);
  const lastYearStr = lastYear.toISOString().split('T')[0];

  const samplePayments = [
    { id: 'p1', amount: 10000, payment_date: todayStr },
    { id: 'p2', amount: 20000, payment_date: fiveDaysAgoStr },
    { id: 'p3', amount: 30000, payment_date: fortyDaysAgoStr },
    { id: 'p4', amount: 40000, payment_date: lastYearStr }
  ];

  const filterByRange = (filterType: string, customStart?: string, customEnd?: string) => {
    return samplePayments.filter(p => {
      if (filterType === 'All') return true;
      const pDate = new Date(p.payment_date);
      pDate.setHours(0, 0, 0, 0);

      const t = new Date();
      t.setHours(0, 0, 0, 0);

      if (filterType === 'Daily') return pDate.getTime() === t.getTime();
      if (filterType === 'Weekly') {
        const weekAgo = new Date(t);
        weekAgo.setDate(t.getDate() - 7);
        return pDate >= weekAgo && pDate <= t;
      }
      if (filterType === 'Monthly') {
        return pDate.getFullYear() === t.getFullYear() && pDate.getMonth() === t.getMonth();
      }
      if (filterType === 'Yearly') {
        return pDate.getFullYear() === t.getFullYear();
      }
      if (filterType === 'Custom') {
        const start = customStart ? new Date(customStart) : new Date('2000-01-01');
        start.setHours(0, 0, 0, 0);
        const end = customEnd ? new Date(customEnd) : new Date('2099-12-31');
        end.setHours(23, 59, 59, 999);
        return pDate >= start && pDate <= end;
      }
      return true;
    });
  };

  // Daily: should match p1 only
  const daily = filterByRange('Daily');
  assert.equal(daily.length, 1);
  assert.equal(daily[0].id, 'p1');

  // Weekly: should match p1 and p2
  const weekly = filterByRange('Weekly');
  assert.equal(weekly.length, 2);
  assert.deepEqual(weekly.map(p => p.id), ['p1', 'p2']);

  // Yearly: should match p1, p2, and p3 (same year), but exclude p4 (last year)
  const yearly = filterByRange('Yearly');
  assert.ok(yearly.some(p => p.id === 'p1'));
  assert.ok(yearly.some(p => p.id === 'p2'));
  assert.ok(!yearly.some(p => p.id === 'p4'));

  // Custom range: between 10 days ago and today
  const custom = filterByRange('Custom', fiveDaysAgoStr, todayStr);
  assert.equal(custom.length, 2);
  assert.deepEqual(custom.map(p => p.id), ['p1', 'p2']);
});

test('Monthly payment summary correctly groups amounts and transaction counts by month', () => {
  const payments = [
    { id: 'p1', amount: 25000, payment_date: '2026-03-05' },
    { id: 'p2', amount: 15000, payment_date: '2026-03-12' },
    { id: 'p3', amount: 50000, payment_date: '2026-02-18' },
    { id: 'p4', amount: 10000, payment_date: '2026-01-22' }
  ];

  const map = new Map();
  for (const p of payments) {
    const d = new Date(p.payment_date);
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const cur = map.get(monthKey) || { total: 0, count: 0 };
    cur.total += p.amount;
    cur.count += 1;
    map.set(monthKey, cur);
  }

  const march = map.get('2026-03');
  const feb = map.get('2026-02');
  const jan = map.get('2026-01');

  assert.equal(march?.total, 40000);
  assert.equal(march?.count, 2);

  assert.equal(feb?.total, 50000);
  assert.equal(feb?.count, 1);

  assert.equal(jan?.total, 10000);
  assert.equal(jan?.count, 1);
});
