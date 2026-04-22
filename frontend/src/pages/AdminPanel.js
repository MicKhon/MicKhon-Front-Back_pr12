import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import apiClient from '../services/api';

const AdminPanel = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAdmin()) { navigate('/products'); return; }
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const response = await apiClient.get('/users');
      setUsers(response.data);
    } catch (error) { console.error('Error loading users:', error); }
    finally { setLoading(false); }
  };

  const handleBlock = async (id) => {
    if (window.confirm('Заблокировать пользователя?')) {
      try {
        await apiClient.delete(`/users/${id}`);
        loadUsers();
      } catch (error) { console.error('Error blocking user:', error); }
    }
  };

  const handleLogout = async () => { await logout(); navigate('/login'); };

  if (loading) return <div style={{textAlign:'center',marginTop:'50px'}}>Загрузка...</div>;

  return (
    <div style={{minHeight:'100vh',backgroundColor:'#f5f5f5'}}>
      <header style={{backgroundColor:'#6f42c1',color:'white',padding:'20px 40px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <h1 style={{margin:0}}>Панель администратора</h1>
        <div style={{display:'flex',alignItems:'center',gap:'20px'}}>
          <span>{user?.first_name} {user?.last_name} ({user?.role})</span>
          <button onClick={handleLogout} style={{backgroundColor:'white',color:'#6f42c1',border:'none',padding:'8px 16px',borderRadius:'4px',cursor:'pointer'}}>Выйти</button>
        </div>
      </header>
      <div style={{padding:'40px',maxWidth:'1200px',margin:'0 auto'}}>
        <h2>Управление пользователями</h2>
        <table style={{width:'100%',backgroundColor:'white',borderCollapse:'collapse',boxShadow:'0 2px 10px rgba(0,0,0,0.1)'}}>
          <thead>
            <tr><th style={{padding:'15px',textAlign:'left',backgroundColor:'#6f42c1',color:'white'}}>Email</th><th style={{padding:'15px',textAlign:'left',backgroundColor:'#6f42c1',color:'white'}}>Имя</th><th style={{padding:'15px',textAlign:'left',backgroundColor:'#6f42c1',color:'white'}}>Фамилия</th><th style={{padding:'15px',textAlign:'left',backgroundColor:'#6f42c1',color:'white'}}>Роль</th><th style={{padding:'15px',textAlign:'left',backgroundColor:'#6f42c1',color:'white'}}>Действия</th></tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td style={{padding:'15px',borderBottom:'1px solid #ddd'}}>{u.email}</td>
                <td style={{padding:'15px',borderBottom:'1px solid #ddd'}}>{u.first_name}</td>
                <td style={{padding:'15px',borderBottom:'1px solid #ddd'}}>{u.last_name}</td>
                <td style={{padding:'15px',borderBottom:'1px solid #ddd'}}>{u.role}</td>
                <td style={{padding:'15px',borderBottom:'1px solid #ddd'}}>
                  <button onClick={()=>handleBlock(u.id)} style={{backgroundColor:'#dc3545',color:'white',border:'none',padding:'8px 16px',borderRadius:'4px',cursor:'pointer'}}>Заблокировать</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminPanel;