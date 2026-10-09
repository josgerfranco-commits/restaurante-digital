import React from 'react';

export default function Despedida() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc', padding: '20px', fontFamily: 'sans-serif' }}>
      <div style={{ background: 'white', padding: '40px', borderRadius: '20px', boxShadow: '0 10px 25px rgba(0,0,0,0.05)', textAlign: 'center', maxWidth: '450px', width: '100%', border: '1px solid #e2e8f0' }}>
        <div style={{ fontSize: '3.5rem', marginBottom: '16px' }}>✨</div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: '900', color: '#0f172a', margin: '0 0 12px 0' }}>¡Muchas gracias por su compra!</h1>
        <p style={{ fontSize: '1rem', color: '#64748b', lineHeight: '1.5', margin: 0 }}>
          Esperamos que haya disfrutado de su estancia en <strong>Terra Viva</strong>.<br />
          ¡Lo esperamos pronto!
        </p>
      </div>
    </div>
  );
}