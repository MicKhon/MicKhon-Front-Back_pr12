import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import TestLogin from '../components/TestLogin';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      navigate('/products');
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка входа');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',backgroundColor:'#f5f5f5',position:'relative'}}>
      <div style={{backgroundColor:'white',padding:'40px',borderRadius:'8px',boxShadow:'0 2px 10px rgba(0,0,0,0.1)',width:'100%',maxWidth:'400px'}}>
        <h2 style={{textAlign:'center',marginBottom:'30px',color:'#333'}}>Вход в систему</h2>
        {error && <div style={{backgroundColor:'#ffe6e6',color:'#d63031',padding:'10px',borderRadius:'4px',marginBottom:'20px'}}>{error}</div>}
        <form onSubmit={handleSubmit}>
          <div style={{marginBottom:'20px'}}>
            <label style={{display:'block',marginBottom:'8px',color:'#555',fontWeight:'500'}}>Email</label>
            <input type="email" value={email} onChange={(e)=>setEmail(e.target.value)} style={{width:'100%',padding:'12px',border:'1px solid #ddd',borderRadius:'4px',fontSize:'14px',boxSizing:'border-box'}} required/>
          </div>
          <div style={{marginBottom:'20px'}}>
            <label style={{display:'block',marginBottom:'8px',color:'#555',fontWeight:'500'}}>Пароль</label>
            <input type="password" value={password} onChange={(e)=>setPassword(e.target.value)} style={{width:'100%',padding:'12px',border:'1px solid #ddd',borderRadius:'4px',fontSize:'14px',boxSizing:'border-box'}} required/>
          </div>
          <button type="submit" style={{width:'100%',padding:'12px',backgroundColor:'#007bff',color:'white',border:'none',borderRadius:'4px',fontSize:'16px',cursor:'pointer'}} disabled={loading}>
            {loading ? 'Вход...' : 'Войти'}
          </button>
        </form>
        <p style={{textAlign:'center',marginTop:'20px',color:'#666'}}>
          Нет аккаунта? <Link to="/register" style={{color:'#007bff',textDecoration:'none'}}>Зарегистрироваться</Link>
        </p>
      </div>
      <TestLogin />
    </div>
  );
};

export default Login;