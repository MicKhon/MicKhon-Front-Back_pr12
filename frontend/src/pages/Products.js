import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { productsAPI } from '../services/api';

const Products = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState({ title: '', category: '', description: '', price: '' });
  
  const { user, logout, isAdmin, isSeller } = useAuth();
  const navigate = useNavigate();

  useEffect(() => { loadProducts(); }, []);

  const loadProducts = async () => {
    try {
      const response = await productsAPI.getAll();
      setProducts(response.data);
    } catch (error) { console.error('Error loading products:', error); }
    finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingProduct) {
        await productsAPI.update(editingProduct.id, formData);
      } else {
        await productsAPI.create(formData);
      }
      setShowForm(false);
      setEditingProduct(null);
      setFormData({ title: '', category: '', description: '', price: '' });
      loadProducts();
    } catch (error) {
      console.error('Error saving product:', error);
      alert('Ошибка при сохранении товара');
    }
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setFormData({ title: product.title, category: product.category, description: product.description || '', price: product.price });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Удалить этот товар?')) {
      try {
        await productsAPI.delete(id);
        loadProducts();
      } catch (error) { console.error('Error deleting product:', error); }
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  if (loading) return <div style={{textAlign:'center',marginTop:'50px'}}>Загрузка...</div>;

  return (
    <div style={{minHeight:'100vh',backgroundColor:'#f5f5f5'}}>
      <header style={{backgroundColor:'#007bff',color:'white',padding:'20px 40px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <h1 style={{margin:0}}>Управление товарами</h1>
        <div style={{display:'flex',alignItems:'center',gap:'20px'}}>
          <span>{user?.first_name} {user?.last_name} ({user?.role})</span>
          <button onClick={handleLogout} style={{backgroundColor:'white',color:'#007bff',border:'none',padding:'8px 16px',borderRadius:'4px',cursor:'pointer'}}>Выйти</button>
        </div>
      </header>

      <div style={{padding:'40px',maxWidth:'1200px',margin:'0 auto'}}>
        {isSeller() && (
          <button onClick={()=>{setShowForm(!showForm);setEditingProduct(null);setFormData({title:'',category:'',description:'',price:''});}} style={{backgroundColor:'#28a745',color:'white',border:'none',padding:'12px 24px',borderRadius:'4px',fontSize:'16px',cursor:'pointer',marginBottom:'20px'}}>
            {showForm ? 'Отмена' : '+ Добавить товар'}
          </button>
        )}

        {showForm && (
          <form onSubmit={handleSubmit} style={{backgroundColor:'white',padding:'30px',borderRadius:'8px',marginBottom:'30px',boxShadow:'0 2px 10px rgba(0,0,0,0.1)'}}>
            <h3>{editingProduct ? 'Редактировать товар' : 'Новый товар'}</h3>
            <div style={{marginBottom:'20px'}}>
              <label style={{display:'block',marginBottom:'8px',color:'#555',fontWeight:'500'}}>Название</label>
              <input type="text" value={formData.title} onChange={(e)=>setFormData({...formData,title:e.target.value})} style={{width:'100%',padding:'12px',border:'1px solid #ddd',borderRadius:'4px',fontSize:'14px',boxSizing:'border-box'}} required/>
            </div>
            <div style={{marginBottom:'20px'}}>
              <label style={{display:'block',marginBottom:'8px',color:'#555',fontWeight:'500'}}>Категория</label>
              <input type="text" value={formData.category} onChange={(e)=>setFormData({...formData,category:e.target.value})} style={{width:'100%',padding:'12px',border:'1px solid #ddd',borderRadius:'4px',fontSize:'14px',boxSizing:'border-box'}} required/>
            </div>
            <div style={{marginBottom:'20px'}}>
              <label style={{display:'block',marginBottom:'8px',color:'#555',fontWeight:'500'}}>Описание</label>
              <textarea value={formData.description} onChange={(e)=>setFormData({...formData,description:e.target.value})} style={{width:'100%',padding:'12px',border:'1px solid #ddd',borderRadius:'4px',fontSize:'14px',minHeight:'100px',boxSizing:'border-box'}}/>
            </div>
            <div style={{marginBottom:'20px'}}>
              <label style={{display:'block',marginBottom:'8px',color:'#555',fontWeight:'500'}}>Цена</label>
              <input type="number" value={formData.price} onChange={(e)=>setFormData({...formData,price:e.target.value})} style={{width:'100%',padding:'12px',border:'1px solid #ddd',borderRadius:'4px',fontSize:'14px',boxSizing:'border-box'}} required/>
            </div>
            <button type="submit" style={{backgroundColor:'#007bff',color:'white',border:'none',padding:'12px 24px',borderRadius:'4px',fontSize:'16px',cursor:'pointer'}}>
              {editingProduct ? 'Сохранить' : 'Создать'}
            </button>
          </form>
        )}

        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill, minmax(300px, 1fr))',gap:'20px'}}>
          {products.map((product) => (
            <div key={product.id} style={{backgroundColor:'white',padding:'20px',borderRadius:'8px',boxShadow:'0 2px 10px rgba(0,0,0,0.1)'}}>
              <h3 style={{margin:'0 0 10px 0',color:'#333'}}>{product.title}</h3>
              <p style={{color:'#666',fontSize:'14px',marginBottom:'10px'}}>{product.category}</p>
              <p style={{color:'#888',fontSize:'14px',marginBottom:'10px'}}>{product.description}</p>
              <p style={{fontSize:'18px',fontWeight:'bold',color:'#28a745',marginBottom:'15px'}}>{product.price} ₽</p>
              <div style={{display:'flex',gap:'10px'}}>
                {isSeller() && (
                  <button onClick={()=>handleEdit(product)} style={{flex:1,backgroundColor:'#ffc107',color:'#333',border:'none',padding:'8px',borderRadius:'4px',cursor:'pointer'}}>Редактировать</button>
                )}
                {isAdmin() && (
                  <button onClick={()=>handleDelete(product.id)} style={{flex:1,backgroundColor:'#dc3545',color:'white',border:'none',padding:'8px',borderRadius:'4px',cursor:'pointer'}}>Удалить</button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Products;