import React from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const TestLogin = () => {
  const navigate = useNavigate();
  const API_URL = 'http://localhost:3000/api';

  const handleTestLogin = async (role) => {
    try {
      const email = `test_${role}@example.com`;
      const password = 'test123';
      
      try {
        await axios.post(`${API_URL}/auth/register`, {
          email, password,
          first_name: role === 'admin' ? 'Тест' : (role === 'seller' ? 'Продавец' : 'Пользователь'),
          last_name: role === 'admin' ? 'Админ' : (role === 'seller' ? 'Продавцов' : 'Пользователей'),
          age: 25, role
        });
      } catch (err) {
        console.log(`User ${role} already exists`);
      }

      const response = await axios.post(`${API_URL}/auth/login`, { email, password });
      const { accessToken, user } = response.data;
      
      console.log('🔑 TOKEN:', accessToken);
      console.log('👤 USER:', user);
      
      localStorage.setItem('accessToken', accessToken);
      navigate('/products');
      setTimeout(() => window.location.reload(), 100);
      
    } catch (error) {
      console.error('❌ Error:', error);
      alert('Ошибка: ' + error.message);
    }
  };

  return (
    <div style={{position:'fixed',bottom:'20px',right:'20px',backgroundColor:'white',padding:'20px',borderRadius:'8px',boxShadow:'0 4px 12px rgba(0,0,0,0.15)',zIndex:1000}}>
      <h3 style={{margin:'0 0 15px 0',textAlign:'center'}}>🔧 Тестовый вход</h3>
      <div style={{display:'flex',flexDirection:'column',gap:'10px'}}>
        <button onClick={()=>handleTestLogin('user')} style={{padding:'10px',backgroundColor:'#6c757d',color:'white',border:'none',borderRadius:'4px',cursor:'pointer'}}>👤 Пользователь</button>
        <button onClick={()=>handleTestLogin('seller')} style={{padding:'10px',backgroundColor:'#ffc107',color:'#333',border:'none',borderRadius:'4px',cursor:'pointer',fontWeight:'bold'}}>💼 Продавец</button>
        <button onClick={()=>handleTestLogin('admin')} style={{padding:'10px',backgroundColor:'#dc3545',color:'white',border:'none',borderRadius:'4px',cursor:'pointer',fontWeight:'bold'}}>👑 Администратор</button>
      </div>
    </div>
  );
};

export default TestLogin;