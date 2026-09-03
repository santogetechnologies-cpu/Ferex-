import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Package, Search, Plus, Eye, Edit3, Trash2, X, CheckCircle2, Thermometer } from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { getRimiProducts, createRimiProduct, updateRimiProduct, deleteRimiProduct } from '../../lib/api/rimi';
import { supabase } from '../../lib/supabase';

export const RimiProducts: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [toast, setToast] = useState('');
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getRimiProducts();
      if (Array.isArray(data)) {
        const formatted = data.map((d: any) => ({
          id: d.sku || d.id,
          rawId: d.id,
          sku: d.sku,
          name: d.name,
          category: d.category,
          unit: d.unit || 'KG',
          rawPrice: Number(d.unit_price),
          price: `₹${Number(d.unit_price).toLocaleString('en-IN')} / ${d.unit || 'KG'}`,
          temp: d.storage_temp || '-18°C',
          minStock: d.min_stock_alert || 50,
          status: 'In Stock',
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

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('ferex_rimi_products_change', handleLocalChange);
    };
  }, [loadData]);

  const [newProd, setNewProd] = useState({
    name: '',
    category: 'Frozen Seafood',
    unit: 'KG',
    price: '₹450',
    temp: '-18°C',
    minStock: 50
  });

  const showToastMsg = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProd.name) return;
    const cleanPrice = parseFloat(newProd.price.replace(/[^0-9.]/g, '')) || 450;
    const created = await createRimiProduct({
      sku: `RIMI-${newProd.category.slice(7, 9).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`,
      name: newProd.name,
      category: newProd.category,
      unit: newProd.unit,
      unit_price: cleanPrice,
      storage_temp: newProd.temp,
      min_stock_alert: Number(newProd.minStock) || 50,
    });
    setShowAddModal(false);
    showToastMsg(`Added frozen SKU ${created.sku || created.name}`);
    setNewProd({ name: '', category: 'Frozen Seafood', unit: 'KG', price: '₹450', temp: '-18°C', minStock: 50 });
    await loadData();
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    await updateRimiProduct(editingProduct.rawId, {
      name: editingProduct.name,
      category: editingProduct.category,
      unit_price: editingProduct.rawPrice,
      storage_temp: editingProduct.temp,
      unit: editingProduct.unit
    });
    setEditingProduct(null);
    showToastMsg('Product SKU updated in database!');
    await loadData();
  };

  const handleDeleteProduct = async (id: string, rawId?: string) => {
    await deleteRimiProduct(rawId || id);
    setProducts(prev => prev.filter(p => p.id !== id && p.rawId !== rawId));
    showToastMsg(`Removed SKU ${id}`);
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = (p.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || (p.sku || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === 'All' || p.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6 text-left antialiased">
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="fixed top-20 right-8 z-50 bg-[#6A1B2E] text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Package className="w-5 h-5 text-[#6A1B2E]" /> Frozen Food Product Master Catalog
          </h1>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            Rimi Cold Chain Console • Master SKU list, unit wholesale prices (₹), storage temp requirements, and stock balances.
          </p>
        </div>
        <Button size="sm" className="bg-[#6A1B2E] hover:bg-[#521221] text-xs font-bold" onClick={() => setShowAddModal(true)}>
          <Plus className="w-4 h-4 mr-1.5" /> Add Master SKU
        </Button>
      </div>

      <Card className="p-4 border border-slate-200/70 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search product name or SKU..." className="w-full h-9 pl-9 pr-4 bg-slate-100/70 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-[#6A1B2E]" />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto">
          {['All', 'Frozen Seafood', 'Frozen Meat & Poultry', 'Frozen Vegetables', 'Processed Food', 'Ice Cream & Dairy'].map((cat) => (
            <button key={cat} onClick={() => setFilterCategory(cat)} className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${filterCategory === cat ? 'bg-[#6A1B2E] text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
              {cat}
            </button>
          ))}
        </div>
      </Card>

      {loading ? (
        <div className="p-8 text-center text-xs font-bold text-slate-400">Loading catalog from database...</div>
      ) : filteredProducts.length === 0 ? (
        <Card className="p-12 text-center border border-dashed border-slate-200">
          <Package className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-black text-slate-800">No products found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            {searchQuery ? 'No products match your query.' : 'There are no active products in the master catalog. Add your first SKU below.'}
          </p>
          <Button size="sm" className="mt-4 bg-[#6A1B2E] hover:bg-[#521221] text-xs font-bold" onClick={() => setShowAddModal(true)}>
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
                  <p className="text-xs font-black text-[#6A1B2E] mt-1">{p.price}</p>
                </div>
                <div className="space-y-1 text-xs text-slate-500 pt-1">
                  <div className="flex items-center gap-1.5 font-bold text-slate-700">
                    <Thermometer className="w-3.5 h-3.5 text-blue-500" />
                    <span>Storage Temp: {p.temp}</span>
                  </div>
                  <div className="text-[11px] font-semibold text-slate-400">
                    Min Stock Reorder: {p.minStock} Units
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <button onClick={() => setSelectedProduct(p)} className="text-xs font-bold text-[#6A1B2E] hover:underline flex items-center gap-1">
                  <Eye className="w-3.5 h-3.5" /> View SKU Specs
                </button>
                <div className="flex items-center gap-1">
                  <button onClick={() => setEditingProduct(p)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100" title="Edit SKU">
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
                <h3 className="text-sm font-black text-slate-900">Add Frozen Product SKU</h3>
                <button onClick={() => setShowAddModal(false)} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
              </div>
              <form onSubmit={handleAddProduct} className="space-y-3">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Product Commercial Title</label>
                  <input type="text" required value={newProd.name} onChange={(e) => setNewProd({ ...newProd, name: e.target.value })} placeholder="e.g. Frozen Atlantic Cod Fillets (1kg)" className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Category</label>
                    <select value={newProd.category} onChange={(e) => setNewProd({ ...newProd, category: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold">
                      <option value="Frozen Seafood">Frozen Seafood</option>
                      <option value="Frozen Meat & Poultry">Frozen Meat & Poultry</option>
                      <option value="Frozen Vegetables">Frozen Vegetables</option>
                      <option value="Processed Food">Processed Food</option>
                      <option value="Ice Cream & Dairy">Ice Cream & Dairy</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Unit of Measure</label>
                    <select value={newProd.unit} onChange={(e) => setNewProd({ ...newProd, unit: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold">
                      <option value="KG">KG</option>
                      <option value="Pack">Pack</option>
                      <option value="Box">Box</option>
                      <option value="Case">Case</option>
                      <option value="Ton">Ton</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Wholesale Price (₹ INR)</label>
                    <input type="text" required value={newProd.price} onChange={(e) => setNewProd({ ...newProd, price: e.target.value })} placeholder="₹450" className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Storage Temp</label>
                    <input type="text" required value={newProd.temp} onChange={(e) => setNewProd({ ...newProd, temp: e.target.value })} placeholder="-18°C" className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                  </div>
                </div>
                <div className="pt-3 flex gap-2">
                  <Button type="button" variant="outline" size="sm" className="flex-1 text-xs font-bold" onClick={() => setShowAddModal(false)}>Cancel</Button>
                  <Button type="submit" size="sm" className="flex-1 text-xs font-bold bg-[#6A1B2E] hover:bg-[#521221]">Save SKU</Button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Edit SKU Modal */}
      <AnimatePresence>
        {editingProduct && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50" onClick={() => setEditingProduct(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-2xl shadow-2xl z-50 border border-slate-100 p-6">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                <h3 className="text-sm font-black text-slate-900">Edit Product SKU Details</h3>
                <button onClick={() => setEditingProduct(null)} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
              </div>
              <form onSubmit={handleSaveEdit} className="space-y-3">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Product Title</label>
                  <input type="text" required value={editingProduct.name} onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Unit Price (₹)</label>
                    <input type="number" required value={editingProduct.rawPrice} onChange={(e) => setEditingProduct({ ...editingProduct, rawPrice: Number(e.target.value) })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Storage Temp</label>
                    <input type="text" required value={editingProduct.temp} onChange={(e) => setEditingProduct({ ...editingProduct, temp: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                  </div>
                </div>
                <div className="pt-3 flex gap-2">
                  <Button type="button" variant="outline" size="sm" className="flex-1 text-xs font-bold" onClick={() => setEditingProduct(null)}>Cancel</Button>
                  <Button type="submit" size="sm" className="flex-1 text-xs font-bold bg-[#6A1B2E] hover:bg-[#521221]">Save Changes</Button>
                </div>
              </form>
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
                  <span className="text-[10px] font-black text-[#6A1B2E] uppercase">{selectedProduct.sku}</span>
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
                    <span className="text-slate-400">Reorder Threshold:</span>
                    <span className="font-bold text-slate-900">{selectedProduct.minStock} Units</span>
                  </div>
                </div>

                <Button size="sm" className="w-full text-xs font-bold bg-[#6A1B2E] hover:bg-[#521221]" onClick={() => setSelectedProduct(null)}>
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
