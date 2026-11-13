import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDraftState } from '../../hooks/useDraftState';
import { Package, Search, Plus, Eye, Edit3, Trash2, X, CheckCircle2, Thermometer, FolderPlus, Tag, Layers } from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { ToastNotification } from '../../components/ToastNotification';
import {
  getRimiProducts,
  createRimiProduct,
  updateRimiProduct,
  deleteRimiProduct,
  getRimiProductCategories,
  createRimiProductCategory,
  deleteRimiProductCategory,
  getRimiWarehouses,
  getRimiBatches,
  addRimiStock
} from '../../lib/api/rimi';
import { supabase } from '../../lib/supabase';

export const RimiProducts: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  // The Add SKU form and its data survive switching to another tab and coming back.
  const [showAddModal, setShowAddModal, clearAddOpen] = useDraftState<boolean>('rimi_product_form_open', false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCatInput, setNewCatInput] = useState('');
  const [toast, setToast] = useState('');
  const [products, setProducts] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [prodData, catData, whData] = await Promise.all([
        getRimiProducts(),
        getRimiProductCategories(),
        getRimiWarehouses()
      ]);

      setCategories(catData || []);
      setWarehouses(whData || []);

      if (Array.isArray(prodData)) {
        const formatted = prodData.map((d: any) => ({
          id: d.sku || d.id,
          rawId: d.id,
          sku: d.sku,
          name: d.name,
          category: d.category || 'Frozen Foods',
          unit: d.unit || 'KG',
          rawPrice: Number(d.unit_price) || 0,
          price: `₹${Number(d.unit_price || 0).toLocaleString('en-IN')} / ${d.unit || 'KG'}`,
          temp: d.storage_temp || '-18°C',
          minStock: d.min_stock_alert || 50,
          stock: Number(d.total_stock) || 0,
          status: (Number(d.total_stock) || 0) <= 0 ? 'Out of Stock' : (Number(d.total_stock) || 0) <= (d.min_stock_alert || 50) ? 'Low Stock' : 'In Stock',
          statusBadge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        }));
        setProducts(formatted);
      } else {
        setProducts([]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    const channel = supabase
      .channel('realtime_rimi_products')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rimi_products' }, () => {
        loadData();
      })
      .subscribe();

    const handleLocalChange = () => loadData();
    window.addEventListener('ferex_rimi_products_change', handleLocalChange);
    window.addEventListener('ferex_rimi_categories_change', handleLocalChange);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('ferex_rimi_products_change', handleLocalChange);
      window.removeEventListener('ferex_rimi_categories_change', handleLocalChange);
    };
  }, [loadData]);

  const [newProd, setNewProd, clearNewProd] = useDraftState('rimi_product_form', {
    name: '',
    category: '',
    unit: 'KG',
    price: '',
    temp: '-18°C',
    minStock: 50,
    quantity: 0,
    warehouse_id: '',
    batch_no: '',
    mfg_date: '',
    expiry_date: ''
  });

  const showToastMsg = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatInput.trim()) return;
    try {
      const updated = await createRimiProductCategory(newCatInput.trim());
      setCategories(updated);
      showToastMsg(`Added product category "${newCatInput.trim()}"`);
      setNewCatInput('');
    } catch (err: any) {
      showToastMsg(err.message || 'Could not add the category');
    }
  };

  const handleDeleteCategory = async (cat: string) => {
    try {
      const updated = await deleteRimiProductCategory(cat);
      setCategories(updated);
      if (filterCategory === cat) setFilterCategory('All');
      showToastMsg(`Removed category "${cat}"`);
    } catch (err: any) {
      showToastMsg(err.message || 'Could not remove the category');
    }
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProd.name.trim()) return;
    try {
      const chosenCategory = newProd.category || categories[0] || 'Frozen Seafood';
      const cleanPrice = parseFloat(String(newProd.price).replace(/[^0-9.]/g, ''));
      if (!(cleanPrice >= 0) || Number.isNaN(cleanPrice)) {
        showToastMsg('Enter the wholesale price.');
        return;
      }
      if (Number(newProd.quantity) > 0) {
        if (!newProd.warehouse_id) { showToastMsg('Choose the cold storage hub for the opening stock.'); return; }
        if (!newProd.expiry_date) { showToastMsg('Enter the batch expiry date.'); return; }
        if (newProd.mfg_date && new Date(newProd.expiry_date) <= new Date(newProd.mfg_date)) { showToastMsg('Expiry date must be after the manufacturing date.'); return; }
      }
      const cleanCatPrefix = chosenCategory.replace(/[^a-zA-Z]/g, '').slice(0, 3).toUpperCase() || 'CAT';
      const newSku = `RIMI-${cleanCatPrefix}-${Math.floor(100 + Math.random() * 900)}`;
      const selectedWh = warehouses.find(w => w.id === newProd.warehouse_id);

      const created = await createRimiProduct({
        sku: newSku,
        name: newProd.name.trim(),
        category: chosenCategory,
        unit: newProd.unit || 'KG',
        unit_price: cleanPrice,
        storage_temp: newProd.temp || '-18°C',
        min_stock_alert: Number(newProd.minStock) || 50,
        quantity: Number(newProd.quantity) || 0,
        warehouse_id: newProd.warehouse_id || undefined,
        warehouse_name: selectedWh?.name,
        batch_no: newProd.batch_no.trim() || undefined,
        mfg_date: newProd.mfg_date || undefined,
        expiry_date: newProd.expiry_date || undefined
      });

      clearAddOpen();
      clearNewProd();
      showToastMsg(`Added frozen SKU ${created?.sku || newSku} (Opening Stock: ${newProd.quantity} ${newProd.unit})`);
      await loadData();
    } catch (err: any) {
      console.error('[RimiProducts] Error saving product SKU:', err);
      showToastMsg(`Failed to save SKU: ${err.message || 'Error'}`);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    try {
      await updateRimiProduct(editingProduct.rawId, {
        name: editingProduct.name,
        category: editingProduct.category,
        unit_price: Number(editingProduct.rawPrice) || 0,
        storage_temp: editingProduct.temp,
        unit: editingProduct.unit || 'KG',
        min_stock_alert: Number(editingProduct.minStock) || 50
      });
      setEditingProduct(null);
      showToastMsg('Product SKU updated.');
      await loadData();
    } catch (err: any) {
      showToastMsg(`Failed to update SKU: ${err.message || 'Error'}`);
    }
  };

  const handleDeleteProduct = async (id: string, rawId?: string) => {
    if (!window.confirm(`Delete SKU "${id}"? Its stock batches are removed with it. Past sales order lines keep their record. This cannot be undone.`)) {
      return;
    }
    try {
      await deleteRimiProduct(rawId || id);
      showToastMsg(`Removed SKU ${id}`);
      await loadData();
    } catch (err: any) {
      showToastMsg(`Error deleting product: ${err.message || 'Unknown error'}`);
    }
  };

  // ── Add stock to an existing batch, or create a new batch at a cold storage hub ──
  const [stockFor, setStockFor] = useState<any>(null);
  const [stockBatches, setStockBatches] = useState<any[]>([]);
  const [stockForm, setStockForm] = useState({ mode: 'new' as 'new' | 'existing', batch_id: '', batch_no: '', warehouse_id: '', mfg_date: '', expiry_date: '', quantity: 0 });
  const [savingStock, setSavingStock] = useState(false);

  const openAddStock = async (p: any) => {
    setStockFor(p);
    setStockForm({ mode: 'new', batch_id: '', batch_no: '', warehouse_id: '', mfg_date: '', expiry_date: '', quantity: 0 });
    try {
      const list = await getRimiBatches({ productId: p.rawId });
      setStockBatches(list.filter(b => b.status !== 'Expired'));
      if (list.length > 0) setStockForm(f => ({ ...f, mode: 'existing', batch_id: list[0].id }));
    } catch {
      setStockBatches([]);
    }
  };

  const handleSaveStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stockFor) return;
    if (!(Number(stockForm.quantity) > 0)) { showToastMsg('Enter a quantity greater than zero.'); return; }
    if (stockForm.mode === 'existing' && !stockForm.batch_id) { showToastMsg('Choose the batch to add stock to.'); return; }
    if (stockForm.mode === 'new') {
      if (!stockForm.warehouse_id) { showToastMsg('Choose the cold storage hub.'); return; }
      if (!stockForm.expiry_date) { showToastMsg('Enter the batch expiry date.'); return; }
      if (stockForm.mfg_date && new Date(stockForm.expiry_date) <= new Date(stockForm.mfg_date)) { showToastMsg('Expiry date must be after the manufacturing date.'); return; }
    }
    setSavingStock(true);
    try {
      await addRimiStock({
        product_id: stockFor.rawId,
        quantity: Number(stockForm.quantity),
        batch_id: stockForm.mode === 'existing' ? stockForm.batch_id : undefined,
        batch_no: stockForm.mode === 'new' ? stockForm.batch_no.trim() || undefined : undefined,
        warehouse_id: stockForm.mode === 'new' ? stockForm.warehouse_id : undefined,
        mfg_date: stockForm.mfg_date || undefined,
        expiry_date: stockForm.expiry_date || undefined,
      });
      showToastMsg(`Added ${stockForm.quantity} ${stockFor.unit} to ${stockFor.name}.`);
      setStockFor(null);
      await loadData();
    } catch (err: any) {
      showToastMsg(`Could not add stock: ${err.message || 'Error'}`);
    } finally {
      setSavingStock(false);
    }
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = (p.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || (p.sku || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === 'All' || p.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6 text-left antialiased">
      <ToastNotification message={toast} onClose={() => setToast('')} />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Package className="w-5 h-5 text-[#58051E]" /> Frozen Food Product Master Catalog
          </h1>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            Rimi Cold Chain Console • Master SKU list, dynamic product categories, unit prices (₹), and storage temp standards.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button size="sm" variant="outline" className="text-xs font-bold border-slate-200 hover:bg-slate-50" onClick={() => setShowCategoryModal(true)}>
            <Layers className="w-3.5 h-3.5 mr-1.5 text-[#58051E]" /> Manage Categories
          </Button>
          <Button size="sm" className="bg-[#58051E] hover:bg-[#430316] text-xs font-bold" onClick={() => {
            setNewProd({ name: '', category: categories[0] || 'Frozen Seafood', unit: 'KG', price: '', temp: '-18°C', minStock: 50, quantity: 0, warehouse_id: '', batch_no: '', mfg_date: '', expiry_date: '' });
            setShowAddModal(true);
          }}>
            <Plus className="w-4 h-4 mr-1.5" /> Add Master SKU
          </Button>
        </div>
      </div>

      <Card className="p-4 border border-slate-200/70 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search product name or SKU..."
              className="w-full h-9 pl-9 pr-4 bg-slate-100/70 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-[#58051E]"
            />
          </div>
          <div className="text-xs font-bold text-slate-500 flex items-center gap-2">
            <span>{filteredProducts.length} Products Shown</span>
            <span className="text-slate-300">•</span>
            <span>{categories.length} Categories</span>
          </div>
        </div>

        {/* Dynamic Category Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
          <button
            onClick={() => setFilterCategory('All')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${filterCategory === 'All' ? 'bg-[#58051E] text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            All Products ({products.length})
          </button>
          {categories.map((cat) => {
            const count = products.filter(p => p.category === cat).length;
            return (
              <button
                key={cat}
                onClick={() => setFilterCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${filterCategory === cat ? 'bg-[#58051E] text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                <span>{cat}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${filterCategory === cat ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'}`}>{count}</span>
              </button>
            );
          })}
          <button
            onClick={() => setShowCategoryModal(true)}
            className="px-2.5 py-1.5 rounded-xl text-xs font-bold text-[#58051E] hover:bg-[#58051E]/10 transition-all whitespace-nowrap flex items-center gap-1 shrink-0"
          >
            <FolderPlus className="w-3.5 h-3.5" /> Add Category
          </button>
        </div>
      </Card>

      {loading ? (
        <div className="p-8 text-center text-xs font-bold text-slate-400">Loading catalog from database...</div>
      ) : filteredProducts.length === 0 ? (
        <Card className="p-12 text-center border border-dashed border-slate-200">
          <Package className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-black text-slate-800">No products found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            {searchQuery ? 'No products match your query.' : 'There are no active products in this category. Add your first SKU below.'}
          </p>
          <Button size="sm" className="mt-4 bg-[#58051E] hover:bg-[#430316] text-xs font-bold" onClick={() => setShowAddModal(true)}>
            <Plus className="w-3.5 h-3.5 mr-1" /> Add Master SKU
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredProducts.map((p) => (
            <Card key={p.id} className="p-5 border border-slate-200/70 shadow-xs space-y-4 hover:border-slate-300 transition-all flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-slate-400 uppercase">{p.sku || p.id}</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${p.statusBadge}`}>{p.category}</span>
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 leading-snug">{p.name}</h3>
                  <p className="text-xs font-black text-[#58051E] mt-1">{p.price}</p>
                </div>
                <div className="space-y-1 text-xs text-slate-500 pt-1">
                  <div className="flex items-center gap-1.5 font-bold text-slate-700">
                    <Thermometer className="w-3.5 h-3.5 text-blue-500" />
                    <span>Storage Temp: {p.temp}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] font-bold">
                    <span className="text-slate-700">Available stock: {Number(p.stock || 0).toLocaleString('en-IN')} {p.unit}</span>
                    <span className={p.status === 'In Stock' ? 'text-emerald-700' : p.status === 'Low Stock' ? 'text-amber-600' : 'text-rose-600'}>{p.status}</span>
                  </div>
                  <div className="text-[11px] font-semibold text-slate-400">
                    Min Stock Reorder: {p.minStock} Units
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <button onClick={() => setSelectedProduct(p)} className="text-xs font-bold text-[#58051E] hover:underline flex items-center gap-1">
                  <Eye className="w-3.5 h-3.5" /> View SKU Specs
                </button>
                <div className="flex items-center gap-1">
                  <button onClick={() => openAddStock(p)} className="px-2 py-1 rounded-lg text-[11px] font-bold text-[#58051E] hover:bg-rose-50" title="Add stock to a batch">+ Stock</button>
                  <button onClick={() => setEditingProduct({ ...p })} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100" title="Edit SKU">
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => handleDeleteProduct(p.id, p.rawId)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50" title="Delete SKU">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add SKU Modal */}
      <AnimatePresence>
        {showAddModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50" onClick={() => setShowAddModal(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-2xl shadow-2xl z-50 border border-slate-100 p-6">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <Package className="w-4 h-4 text-[#58051E]" /> Add Frozen Product SKU
                </h3>
                <button onClick={() => setShowAddModal(false)} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
              </div>
              <form onSubmit={handleAddProduct} className="space-y-3">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Product Commercial Title</label>
                  <input type="text" required value={newProd.name} onChange={(e) => setNewProd({ ...newProd, name: e.target.value })} placeholder="e.g. Frozen Atlantic Cod Fillets (1kg)" className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Product Category</label>
                    <select
                      value={newProd.category || (categories[0] || 'Frozen Seafood')}
                      onChange={(e) => setNewProd({ ...newProd, category: e.target.value })}
                      className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900"
                    >
                      {categories.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Unit of Measure</label>
                    <select value={newProd.unit} onChange={(e) => setNewProd({ ...newProd, unit: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900">
                      <option value="KG">KG (Kilogram)</option>
                      <option value="Pack">Pack / Packet</option>
                      <option value="Box">Box (Carton)</option>
                      <option value="Case">Case (12 Units)</option>
                      <option value="Ton">Metric Ton (MT)</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Wholesale Price (₹ INR)</label>
                     <input type="number" min="0" step="any" required value={newProd.price} onChange={(e) => setNewProd({ ...newProd, price: e.target.value })} placeholder="e.g. 450" className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Storage Temp</label>
                    <input type="text" required value={newProd.temp} onChange={(e) => setNewProd({ ...newProd, temp: e.target.value })} placeholder="-18°C" className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Product Quantity / Opening Stock</label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={newProd.quantity || ''}
                      onChange={(e) => setNewProd({ ...newProd, quantity: Number(e.target.value) || 0 })}
                      placeholder="e.g. 500"
                      className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-[#58051E]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Min Stock Reorder Alert</label>
                    <input type="number" required value={newProd.minStock} onChange={(e) => setNewProd({ ...newProd, minStock: Number(e.target.value) || 50 })} placeholder="50" className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900" />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Cold Storage Hub / Facility Assignment {Number(newProd.quantity) > 0 ? '*' : ''}</label>
                  <select
                    value={newProd.warehouse_id}
                    onChange={(e) => setNewProd({ ...newProd, warehouse_id: e.target.value })}
                    className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900"
                  >
                    <option value="">Select Cold Storage Hub</option>
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>{w.name} ({w.city}) • {w.cold_room_temp_celsius}°C</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Batch / Lot Number</label>
                    <input
                      type="text"
                      value={newProd.batch_no}
                      onChange={(e) => setNewProd({ ...newProd, batch_no: e.target.value })}
                      placeholder="Auto-generate or enter Lot #"
                      className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Manufacturing Date</label>
                    <input
                      type="date"
                      value={newProd.mfg_date}
                      max={new Date().toISOString().slice(0, 10)}
                      onChange={(e) => setNewProd({ ...newProd, mfg_date: e.target.value })}
                      className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Batch Expiry Date</label>
                    <input
                      type="date"
                      value={newProd.expiry_date}
                      onChange={(e) => setNewProd({ ...newProd, expiry_date: e.target.value })}
                      className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900"
                    />
                  </div>
                </div>
                <div className="pt-3 flex gap-2">
                  <Button type="button" variant="outline" size="sm" className="flex-1 text-xs font-bold" onClick={() => setShowAddModal(false)}>Cancel</Button>
                  <Button type="submit" size="sm" className="flex-1 text-xs font-bold bg-[#58051E] hover:bg-[#430316]">Save Master SKU</Button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Add Stock Modal */}
      <AnimatePresence>
        {stockFor && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50" onClick={() => setStockFor(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-2xl shadow-2xl z-50 border border-slate-100 p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-black text-slate-900">Add Stock — {stockFor.name}</h3>
                  <p className="text-[11px] font-semibold text-slate-500">Currently {Number(stockFor.stock || 0).toLocaleString('en-IN')} {stockFor.unit} available</p>
                </div>
                <button onClick={() => setStockFor(null)} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
              </div>
              <form onSubmit={handleSaveStock} className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-xs font-bold">
                  <button type="button" disabled={stockBatches.length === 0} onClick={() => setStockForm({ ...stockForm, mode: 'existing', batch_id: stockForm.batch_id || stockBatches[0]?.id || '' })}
                    className={`h-9 rounded-xl border ${stockForm.mode === 'existing' ? 'bg-[#58051E] text-white border-[#58051E]' : 'bg-white text-slate-600 border-slate-200'} disabled:opacity-40`}>Existing batch</button>
                  <button type="button" onClick={() => setStockForm({ ...stockForm, mode: 'new' })}
                    className={`h-9 rounded-xl border ${stockForm.mode === 'new' ? 'bg-[#58051E] text-white border-[#58051E]' : 'bg-white text-slate-600 border-slate-200'}`}>New batch</button>
                </div>
                {stockForm.mode === 'existing' ? (
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Batch</label>
                    <select value={stockForm.batch_id} onChange={(e) => setStockForm({ ...stockForm, batch_id: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900">
                      {stockBatches.map(b => (
                        <option key={b.id} value={b.id}>{b.batch_no} · {b.warehouse_name || 'No hub'} · {b.quantity} {b.unit} · exp {b.expiry_date}</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Cold Storage Hub *</label>
                      <select value={stockForm.warehouse_id} onChange={(e) => setStockForm({ ...stockForm, warehouse_id: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900">
                        <option value="">Select Cold Storage Hub</option>
                        {warehouses.map(w => <option key={w.id} value={w.id}>{w.name} ({w.city})</option>)}
                      </select>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Batch / Lot No.</label>
                        <input type="text" value={stockForm.batch_no} onChange={(e) => setStockForm({ ...stockForm, batch_no: e.target.value })} placeholder="Auto" className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Mfg Date</label>
                        <input type="date" value={stockForm.mfg_date} onChange={(e) => setStockForm({ ...stockForm, mfg_date: e.target.value })} className="w-full h-9 px-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Expiry *</label>
                        <input type="date" value={stockForm.expiry_date} onChange={(e) => setStockForm({ ...stockForm, expiry_date: e.target.value })} className="w-full h-9 px-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900" />
                      </div>
                    </div>
                  </>
                )}
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Quantity ({stockFor.unit}) *</label>
                  <input type="number" min="0" step="any" value={stockForm.quantity || ''} onChange={(e) => setStockForm({ ...stockForm, quantity: Number(e.target.value) || 0 })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900" />
                </div>
                <div className="pt-3 flex gap-2">
                  <Button type="button" variant="outline" size="sm" className="flex-1 text-xs font-bold" onClick={() => setStockFor(null)}>Cancel</Button>
                  <Button type="submit" size="sm" disabled={savingStock} className="flex-1 text-xs font-bold bg-[#58051E] hover:bg-[#430316]">{savingStock ? 'Saving…' : 'Add Stock'}</Button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Edit SKU Modal with Category & Unit Controls */}
      <AnimatePresence>
        {editingProduct && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50" onClick={() => setEditingProduct(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-2xl shadow-2xl z-50 border border-slate-100 p-6">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                    <Edit3 className="w-4 h-4 text-[#58051E]" /> Edit Product SKU Details
                  </h3>
                  <p className="text-[10px] font-bold text-slate-400">{editingProduct.sku}</p>
                </div>
                <button onClick={() => setEditingProduct(null)} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
              </div>
              <form onSubmit={handleSaveEdit} className="space-y-3">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Product Title</label>
                  <input
                    type="text"
                    required
                    value={editingProduct.name}
                    onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                    className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Category</label>
                    <select
                      value={editingProduct.category}
                      onChange={(e) => setEditingProduct({ ...editingProduct, category: e.target.value })}
                      className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900"
                    >
                      {categories.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Unit of Measure</label>
                    <select
                      value={editingProduct.unit || 'KG'}
                      onChange={(e) => setEditingProduct({ ...editingProduct, unit: e.target.value })}
                      className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900"
                    >
                      <option value="KG">KG (Kilogram)</option>
                      <option value="Pack">Pack / Packet</option>
                      <option value="Box">Box (Carton)</option>
                      <option value="Case">Case (12 Units)</option>
                      <option value="Ton">Metric Ton (MT)</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Unit Price (₹)</label>
                    <input
                      type="number"
                      required
                      value={editingProduct.rawPrice}
                      onChange={(e) => setEditingProduct({ ...editingProduct, rawPrice: Number(e.target.value) })}
                      className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Storage Temp</label>
                    <input
                      type="text"
                      required
                      value={editingProduct.temp}
                      onChange={(e) => setEditingProduct({ ...editingProduct, temp: e.target.value })}
                      className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Min Stock Reorder Alert</label>
                  <input
                    type="number"
                    required
                    value={editingProduct.minStock}
                    onChange={(e) => setEditingProduct({ ...editingProduct, minStock: Number(e.target.value) })}
                    className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900"
                  />
                </div>
                <div className="pt-3 flex gap-2">
                  <Button type="button" variant="outline" size="sm" className="flex-1 text-xs font-bold" onClick={() => setEditingProduct(null)}>Cancel</Button>
                  <Button type="submit" size="sm" className="flex-1 text-xs font-bold bg-[#58051E] hover:bg-[#430316]">Save Changes</Button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Category Management Modal */}
      <AnimatePresence>
        {showCategoryModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50" onClick={() => setShowCategoryModal(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-2xl shadow-2xl z-50 border border-slate-100 p-6 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-[#58051E]" /> Manage Product Categories
                  </h3>
                  <p className="text-[11px] font-semibold text-slate-400">Add custom categories for Rimi Frozen cold chain catalog</p>
                </div>
                <button onClick={() => setShowCategoryModal(false)} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
              </div>

              {/* Add category form */}
              <form onSubmit={handleAddCategory} className="flex gap-2">
                <input
                  type="text"
                  required
                  value={newCatInput}
                  onChange={(e) => setNewCatInput(e.target.value)}
                  placeholder="e.g. Ready-to-Cook Snacks"
                  className="flex-1 h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-[#58051E]"
                />
                <Button type="submit" size="sm" className="bg-[#58051E] hover:bg-[#430316] text-xs font-bold shrink-0">
                  <Plus className="w-3.5 h-3.5 mr-1" /> Add Category
                </Button>
              </form>

              {/* Existing Categories List */}
              <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                {categories.map((cat) => {
                  const count = products.filter(p => p.category === cat).length;
                  return (
                    <div key={cat} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100/70 border border-slate-200/60 transition-colors">
                      <div className="flex items-center gap-2">
                        <Tag className="w-3.5 h-3.5 text-[#58051E]" />
                        <span className="text-xs font-bold text-slate-800">{cat}</span>
                        <span className="text-[10px] font-semibold text-slate-400">({count} SKUs)</span>
                      </div>
                      <button
                        onClick={() => handleDeleteCategory(cat)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                        title={`Delete ${cat}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>

              <div className="pt-2 border-t border-slate-100 flex justify-end">
                <Button size="sm" variant="outline" className="text-xs font-bold" onClick={() => setShowCategoryModal(false)}>
                  Done
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Drawer Details */}
      <AnimatePresence>
        {selectedProduct && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.4 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900 z-40" onClick={() => setSelectedProduct(null)} />
            <motion.div initial={{ translateX: '100%' }} animate={{ translateX: 0 }} exit={{ translateX: '100%' }} transition={{ duration: 0.25 }} className="fixed top-0 right-0 h-screen w-full max-w-md bg-white z-50 shadow-2xl p-6 overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
                <h3 className="text-sm font-black text-slate-900">SKU Technical Specification</h3>
                <button onClick={() => setSelectedProduct(null)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"><X className="w-4 h-4" /></button>
              </div>

              <div className="space-y-4 text-left">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                  <span className="text-[10px] font-black text-[#58051E] uppercase">{selectedProduct.sku}</span>
                  <h4 className="text-base font-black text-slate-900">{selectedProduct.name}</h4>
                  <p className="text-xs font-semibold text-slate-500">Category: {selectedProduct.category}</p>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl space-y-2 text-xs font-semibold text-slate-700">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Wholesale Unit Price:</span>
                    <span className="font-bold text-slate-900">{selectedProduct.price}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Storage Temperature:</span>
                    <span className="font-bold text-slate-900">{selectedProduct.temp}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Unit of Measure:</span>
                    <span className="font-bold text-slate-900">{selectedProduct.unit}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Reorder Threshold:</span>
                    <span className="font-bold text-slate-900">{selectedProduct.minStock} Units</span>
                  </div>
                </div>

                <Button size="sm" className="w-full text-xs font-bold bg-[#58051E] hover:bg-[#430316]" onClick={() => setSelectedProduct(null)}>
                  Close Specification
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
