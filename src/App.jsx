import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { QRCodeCanvas } from 'qrcode.react';

// Catálogo completo de Comida, Bebidas y Postres
const PRODUCTOS_DEFAULT = [
  // --- COMIDA ---
  {
    id: 1,
    nombre: "Picaña al Grill",
    descripcion: "Corte jugoso a las brasas con chimichurri de la casa",
    precio: 120.00,
    categoria: "Comida",
    imagen: "https://images.unsplash.com/photo-1558030006-450675393462?auto=format&fit=crop&w=500&q=80"
  },
  {
    id: 2,
    nombre: "Arroz meloso",
    descripcion: "Arroz con mariscos de temporada al estilo de la casa",
    precio: 85.00,
    categoria: "Comida",
    imagen: "https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?auto=format&fit=crop&w=500&q=80"
  },
  {
    id: 3,
    nombre: "Hamburguesa Brasa",
    descripcion: "Doble carne angus, queso cheddar fundido y tocino crujiente",
    precio: 75.00,
    categoria: "Comida",
    imagen: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=500&q=80"
  },
  {
    id: 4,
    nombre: "Costillas BBQ ahumadas",
    descripcion: "Bañadas en salsa barbacoa artesanal con papas rústicas",
    precio: 95.00,
    categoria: "Comida",
    imagen: "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=500&q=80"
  },

  // --- BEBIDAS ---
  {
    id: 5,
    nombre: "Limonada con Hierbabuena",
    descripcion: "Bebida refrescante natural de la casa",
    precio: 25.00,
    categoria: "Bebidas",
    imagen: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=500&q=80"
  },
  {
    id: 6,
    nombre: "Jugo de Maracuyá Natural",
    descripcion: "Exótica y refrescante fruta de la pasión con hielo frappé",
    precio: 28.00,
    categoria: "Bebidas",
    imagen: "https://images.unsplash.com/photo-1541658016709-82535e94bc69?auto=format&fit=crop&w=500&q=80"
  },
  {
    id: 7,
    nombre: "Te Frío de Durazno",
    descripcion: "Infusión natural de té negro con toque de durazno y limón",
    precio: 22.00,
    categoria: "Bebidas",
    imagen: "https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&w=500&q=80"
  },
  {
    id: 8,
    nombre: "Smoothie de Frutos Rojos",
    descripcion: "Mix helado de fresa, mora y arándanos con yogurt",
    precio: 32.00,
    categoria: "Bebidas",
    imagen: "https://images.unsplash.com/photo-1553530666-ba11a7da3888?auto=format&fit=crop&w=500&q=80"
  },

  // --- POSTRES ---
  {
    id: 9,
    nombre: "Pastel Tres Leches",
    descripcion: "Tradicional bizcocho bañado en tres tipos de leche y merengue",
    precio: 35.00,
    categoria: "Postres",
    imagen: "https://images.unsplash.com/photo-1464349095431-e9a21285b5f3?auto=format&fit=crop&w=500&q=80"
  },
  {
    id: 10,
    nombre: "Pay de Limón Cremoso",
    descripcion: "Base crujiente de galleta con crema fina de limón y ralladura",
    precio: 30.00,
    categoria: "Postres",
    imagen: "https://images.unsplash.com/photo-1519869325930-281384150729?auto=format&fit=crop&w=500&q=80"
  },
  {
    id: 11,
    nombre: "Cheesecake de Frutos Rojos",
    descripcion: "Suave pastel de queso estilo NY con cobertura de moras y frambuesas",
    precio: 40.00,
    categoria: "Postres",
    imagen: "https://images.unsplash.com/photo-1533134242443-d4fd215305ad?auto=format&fit=crop&w=500&q=80"
  },
  {
    id: 12,
    nombre: "Volcán de Chocolate",
    descripcion: "Pastelito tibio de chocolate con centro fundido y bola de helado de vainilla",
    precio: 45.00,
    categoria: "Postres",
    imagen: "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=500&q=80"
  }
];

export default function App() {
  const [ruta, setRuta] = useState('/');
  const [mesa, setMesa] = useState('1');
  
  // Estados para Cliente
  const [productos, setProductos] = useState(PRODUCTOS_DEFAULT);
  const [categoriaActiva, setCategoriaActiva] = useState('Comida');
  const [carrito, setCarrito] = useState([]);
  const [modalCarrito, setModalCarrito] = useState(false);
  const [nombreCliente, setNombreCliente] = useState('');
  const [nitCliente, setNitCliente] = useState('');
  const [ordenEnviada, setOrdenEnviada] = useState(false);
  const [cuentaSolicitada, setCuentaSolicitada] = useState(false);
  const [tienePedidoActivo, setTienePedidoActivo] = useState(false);
  const [mesaLiberada, setMesaLiberada] = useState(false);

  // Estados para Admin / Cocina y Autenticación Supabase
  const [sesion, setSesion] = useState(null);
  const [emailLogin, setEmailLogin] = useState('');
  const [passwordLogin, setPasswordLogin] = useState('');
  const [errorLogin, setErrorLogin] = useState('');
  const [pedidos, setPedidos] = useState([]);
  const [loadingAdmin, setLoadingAdmin] = useState(false);

  // Estado para generador de QR
  const [cantidadMesas, setCantidadMesas] = useState(6);

  useEffect(() => {
    const rawPath = window.location.pathname.toLowerCase();
    const params = new URLSearchParams(window.location.search);
    const mesaParam = params.get('mesa');
    if (mesaParam) setMesa(mesaParam);

    if (rawPath.includes('admin')) {
      setRuta('/admin');
      supabase.auth.getSession().then(({ data: { session } }) => {
        setSesion(session);
        if (session) fetchPedidos();
      });

      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setSesion(session);
        if (session) fetchPedidos();
      });

      return () => subscription.unsubscribe();
    } else if (rawPath.includes('qr')) {
      setRuta('/qr');
    } else {
      setRuta('/');
      fetchProductos();
      verificarEstadoMesa();
    }
  }, [mesa]);

  // Suscripción en tiempo real para el cliente
  useEffect(() => {
    if (ruta === '/') {
      const canalCliente = supabase
        .channel(`cliente-mesa-${mesa}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos' }, () => {
          verificarEstadoMesa();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(canalCliente);
      };
    }
  }, [mesa, ruta]);

  // Suscripción en tiempo real para la cocina
  useEffect(() => {
    if (ruta === '/admin' && sesion) {
      const canalAdmin = supabase
        .channel('public:pedidos')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos' }, () => {
          fetchPedidos();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(canalAdmin);
      };
    }
  }, [ruta, sesion]);

  const verificarEstadoMesa = async () => {
    try {
      const { data } = await supabase
        .from('pedidos')
        .select('*')
        .eq('mesa', `Mesa #${mesa}`);
      
      if (data && data.length > 0) {
        setTienePedidoActivo(true);
        setMesaLiberada(false);
        if (data[0].estado === 'cuenta_solicitada') {
          setCuentaSolicitada(true);
        } else {
          setCuentaSolicitada(false);
        }
      } else {
        // Si ya no existe registro en pedidos, la mesa fue cobrada y liberada
        setTienePedidoActivo(false);
        setCuentaSolicitada(false);
        setMesaLiberada(true);
      }
    } catch {
      setTienePedidoActivo(false);
      setCuentaSolicitada(false);
    }
  };

  const fetchProductos = async () => {
    try {
      const { data, error } = await supabase.from('productos').select('*');
      if (error) throw error;
      if (data && data.length > 0) setProductos(data);
    } catch (err) {
      console.warn('Usando catálogo local:', err);
    }
  };

  const fetchPedidos = async () => {
    try {
      const { data, error } = await supabase
        .from('pedidos')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      if (data) setPedidos(data);
    } catch (err) {
      console.error('Error al cargar pedidos:', err);
    }
  };

  const manejarLogin = async (e) => {
    e.preventDefault();
    setErrorLogin('');
    setLoadingAdmin(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: emailLogin,
        password: passwordLogin,
      });

      if (error) throw error;
    } catch (err) {
      setErrorLogin(err.message || 'Credenciales inválidas.');
    } finally {
      setLoadingAdmin(false);
    }
  };

  const cerrarSesion = async () => {
    await supabase.auth.signOut();
    setSesion(null);
    setPedidos([]);
  };

  // Liberar mesa desde admin
  const liberarMesa = async (id) => {
    const confirmar = window.confirm('¿Deseas cobrar y liberar esta mesa para nuevos clientes?');
    if (!confirmar) return;

    try {
      const { error } = await supabase
        .from('pedidos')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      fetchPedidos();
    } catch (err) {
      console.error('Error al liberar mesa:', err);
      alert('Hubo un error al liberar la mesa.');
    }
  };

  const agregarAlCarrito = (producto) => {
    const id = producto.id || producto.codigo;
    const nombre = producto.nombre || producto.name;
    const precio = Number(producto.precio || producto.price || 0);

    setCarrito(prev => {
      const existe = prev.find(item => item.id === id);
      if (existe) {
        return prev.map(item => 
          item.id === id ? { ...item, cantidad: item.cantidad + 1 } : item
        );
      }
      return [...prev, { id, nombre, precio, cantidad: 1 }];
    });
  };

  const cambiarCantidad = (id, delta) => {
    setCarrito(prev => prev.map(item => {
      if (item.id === id) {
        const nuevaCantidad = item.cantidad + delta;
        return nuevaCantidad > 0 ? { ...item, cantidad: nuevaCantidad } : null;
      }
      return item;
    }).filter(Boolean));
  };

  const calcularTotal = () => {
    return carrito.reduce((acc, item) => acc + (item.precio * item.cantidad), 0).toFixed(2);
  };

  // Enviar pedido o acumular
  const enviarPedido = async (e) => {
    e.preventDefault();
    if (carrito.length === 0) return;

    if (!tienePedidoActivo && (!nombreCliente.trim() || !nitCliente.trim())) {
      alert('Por favor, ingresa el nombre del cliente y el NIT antes de enviar tu primer pedido.');
      return;
    }

    try {
      const nombreMesaStr = `Mesa #${mesa}`;

      const { data: pedidosExistentes, error: errorBusqueda } = await supabase
        .from('pedidos')
        .select('*')
        .eq('mesa', nombreMesaStr);

      if (errorBusqueda) throw errorBusqueda;

      if (pedidosExistentes && pedidosExistentes.length > 0) {
        const pedidoActual = pedidosExistentes[0];
        const itemsCombinados = [...(pedidoActual.items || [])];
        
        carrito.forEach(nuevoItem => {
          const indexExistente = itemsCombinados.findIndex(i => i.id === nuevoItem.id);
          if (indexExistente >= 0) {
            itemsCombinados[indexExistente].cantidad += nuevoItem.cantidad;
          } else {
            itemsCombinados.push(nuevoItem);
          }
        });

        const nuevoTotal = itemsCombinados.reduce((acc, item) => acc + (item.precio * item.cantidad), 0);

        const { error: errorUpdate } = await supabase
          .from('pedidos')
          .update({
            items: itemsCombinados,
            total: parseFloat(nuevoTotal),
            estado: 'pendiente'
          })
          .eq('id', pedidoActual.id);

        if (errorUpdate) throw errorUpdate;

      } else {
        const infoClienteStr = `${nombreCliente.trim()} (NIT: ${nitCliente.trim()})`;

        const { error: errorInsert } = await supabase.from('pedidos').insert([{
          mesa: nombreMesaStr,
          cliente: infoClienteStr,
          items: carrito,
          total: parseFloat(calcularTotal()),
          estado: 'pendiente'
        }]);

        if (errorInsert) throw errorInsert;
        setTienePedidoActivo(true);
      }

      setOrdenEnviada(true);
      setCarrito([]);
      setCuentaSolicitada(false);
      setTimeout(() => {
        setOrdenEnviada(false);
        setModalCarrito(false);
      }, 4000);

    } catch (err) {
      console.error('Error al enviar pedido:', err);
      alert(`Hubo un error al enviar tu pedido: ${err.message || JSON.stringify(err)}`);
    }
  };

  // Solicitar cuenta
  const solicitarCuenta = async () => {
    const confirmar = window.confirm('¿Deseas solicitar tu cuenta al mesero? Ya no podrás agregar más platillos.');
    if (!confirmar) return;

    try {
      const nombreMesaStr = `Mesa #${mesa}`;
      const { data: pedidosExistentes } = await supabase
        .from('pedidos')
        .select('*')
        .eq('mesa', nombreMesaStr);

      if (pedidosExistentes && pedidosExistentes.length > 0) {
        await supabase
          .from('pedidos')
          .update({ estado: 'cuenta_solicitada' })
          .eq('id', pedidosExistentes[0].id);

        setCuentaSolicitada(true);
        alert('¡Cuenta solicitada! Un mesero se acercará a cobrar a tu mesa en breve.');
      } else {
        alert('No tienes pedidos activos para solicitar la cuenta.');
      }
    } catch (err) {
      console.error('Error al solicitar cuenta:', err);
    }
  };

  const productosFiltrados = productos.filter(p => {
    const cat = p.categoria || p.category || 'Comida';
    return cat.toLowerCase() === categoriaActiva.toLowerCase();
  });

  // ================= VISTA GENERADOR DE QR (/qr) =================
  if (ruta === '/qr') {
    const baseUrl = window.location.origin;

    return (
      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '30px 20px', fontFamily: 'sans-serif' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #e2e8f0', paddingBottom: '15px', marginBottom: '25px' }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: '900', margin: '0 0 4px 0', color: '#0f172a' }}>Generador de Códigos QR 📱</h1>
            <p style={{ fontSize: '0.875rem', color: '#64748b', margin: 0 }}>Crea y descarga los códigos QR para cada mesa de tu restaurante</p>
          </div>
          <a href="/" style={{ background: '#0f172a', color: 'white', textDecoration: 'none', padding: '8px 16px', borderRadius: '8px', fontWeight: 'bold', fontSize: '0.875rem' }}>Ir al Menú</a>
        </div>

        <div style={{ background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '30px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <label style={{ fontWeight: 'bold', fontSize: '0.875rem', color: '#334155' }}>Cantidad total de mesas:</label>
          <input 
            type="number" 
            min="1" 
            max="50" 
            value={cantidadMesas} 
            onChange={(e) => setCantidadMesas(Math.max(1, parseInt(e.target.value) || 1))}
            style={{ width: '80px', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '1rem', fontWeight: 'bold' }}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '20px' }}>
          {Array.from({ length: cantidadMesas }, (_, index) => {
            const numeroMesa = index + 1;
            const urlMesa = `${baseUrl}/?mesa=${numeroMesa}`;

            return (
              <div key={numeroMesa} style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '20px', textAlign: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <h3 style={{ fontWeight: 'bold', fontSize: '1.125rem', color: '#0f172a', margin: '0 0 4px 0' }}>Mesa #{numeroMesa}</h3>
                <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '0 0 16px 0', wordBreak: 'break-all' }}>{urlMesa}</p>
                
                <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '12px', border: '1px solid #f1f5f9', marginBottom: '16px' }}>
                  <QRCodeCanvas 
                    id={`qr-mesa-${numeroMesa}`}
                    value={urlMesa} 
                    size={150}
                    level={"H"}
                    includeMargin={true}
                  />
                </div>

                <button 
                  onClick={() => {
                    const canvas = document.getElementById(`qr-mesa-${numeroMesa}`);
                    const pngUrl = canvas.toDataURL("image/png").replace("image/png", "image/octet-stream");
                    let downloadLink = document.createElement("a");
                    downloadLink.href = pngUrl;
                    downloadLink.download = `Mesa-${numeroMesa}-QR.png`;
                    document.body.appendChild(downloadLink);
                    downloadLink.click();
                    document.body.removeChild(downloadLink);
                  }}
                  style={{ width: '100%', background: '#f59e0b', color: 'white', border: 'none', padding: '10px', borderRadius: '10px', fontWeight: 'bold', fontSize: '0.75rem', cursor: 'pointer', boxShadow: '0 2px 6px rgba(245, 158, 11, 0.3)' }}
                >
                  Descargar QR 📥
                </button>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ================= VISTA ADMIN / COCINA (/admin) =================
  if (ruta === '/admin') {
    if (!sesion) {
      return (
        <div style={{ maxWidth: '400px', margin: '80px auto', background: 'white', padding: '30px', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', border: '1px solid #e2e8f0' }}>
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#0f172a', margin: '0 0 4px 0' }}>Panel Cocina - Brasa</h2>
            <p style={{ fontSize: '0.75rem', color: '#64748b', margin: 0 }}>Inicia sesión con tu cuenta de Supabase</p>
          </div>

          {errorLogin && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '10px', borderRadius: '8px', fontSize: '0.75rem', marginBottom: '16px', textAlign: 'center' }}>
              {errorLogin}
            </div>
          )}

          <form onSubmit={manejarLogin}>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 'bold', color: '#475569', marginBottom: '4px' }}>Correo Electrónico</label>
              <input 
                type="email" 
                placeholder="cocina@brasa.com" 
                value={emailLogin}
                onChange={(e) => setEmailLogin(e.target.value)}
                required
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '10px', boxSizing: 'border-box', fontSize: '0.875rem' }}
              />
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 'bold', color: '#475569', marginBottom: '4px' }}>Contraseña</label>
              <input 
                type="password" 
                placeholder="••••••••" 
                value={passwordLogin}
                onChange={(e) => setPasswordLogin(e.target.value)}
                required
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '10px', boxSizing: 'border-box', fontSize: '0.875rem' }}
              />
            </div>
            <button 
              type="submit" 
              disabled={loadingAdmin}
              style={{ width: '100%', background: '#0f172a', color: 'white', border: 'none', padding: '12px', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.875rem', boxShadow: '0 4px 12px rgba(15, 23, 42, 0.2)' }}
            >
              {loadingAdmin ? 'Verificando...' : 'Ingresar a Cocina'}
            </button>
          </form>
        </div>
      );
    }

    return (
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #e2e8f0', paddingBottom: '15px', marginBottom: '25px' }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: '900', margin: '0 0 2px 0' }}>Órdenes en Cocina 🍳</h1>
            <p style={{ fontSize: '0.875rem', color: '#64748b', margin: 0 }}>Conectado como: {sesion.user.email}</p>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <a href="/qr" style={{ background: '#f59e0b', color: 'white', textDecoration: 'none', padding: '8px 16px', borderRadius: '8px', fontWeight: 'bold', fontSize: '0.875rem', display: 'flex', alignItems: 'center' }}>Generar QRs 📱</a>
            <button onClick={cerrarSesion} style={{ background: '#ef4444', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.875rem' }}>Cerrar Sesión</button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
          {pedidos.length === 0 ? (
            <p style={{ color: '#94a3b8' }}>No hay mesas ocupadas en este momento.</p>
          ) : (
            pedidos.map(pedido => {
              const esCuentaSolicitada = pedido.estado === 'cuenta_solicitada';

              return (
                <div key={pedido.id} style={{ background: 'white', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.06)', border: esCuentaSolicitada ? '2px solid #dc2626' : '1px solid #e2e8f0', padding: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontWeight: 'bold', color: '#d97706', fontSize: '1.1rem' }}>{pedido.mesa}</span>
                      <span style={{ fontSize: '0.75rem', background: esCuentaSolicitada ? '#fee2e2' : '#dcfce7', color: esCuentaSolicitada ? '#991b1b' : '#166534', padding: '4px 8px', borderRadius: '6px', fontWeight: '600' }}>
                        {esCuentaSolicitada ? '⚠️ CUENTA SOLICITADA' : 'Activa 🟢'}
                      </span>
                    </div>
                    <p style={{ fontSize: '0.875rem', fontWeight: 'bold', color: '#1e293b', marginBottom: '8px' }}>{pedido.cliente}</p>
                    <ul style={{ fontSize: '0.75rem', color: '#475569', listStyle: 'none', padding: 0, margin: '0 0 16px 0', borderTop: '1px solid #f1f5f9', borderBottom: '1px solid #f1f5f9', padding: '8px 0' }}>
                      {pedido.items && pedido.items.map((item, idx) => (
                        <li key={idx} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <span>{item.cantidad}x {item.nombre}</span>
                          <span>Q {(item.precio * item.cantidad).toFixed(2)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '0.875rem', marginBottom: '12px' }}>
                      <span>Total acumulado:</span>
                      <span style={{ color: '#d97706' }}>Q {Number(pedido.total).toFixed(2)}</span>
                    </div>
                    <button 
                      onClick={() => liberarMesa(pedido.id)}
                      disabled={!esCuentaSolicitada}
                      style={{ 
                        background: esCuentaSolicitada ? '#dc2626' : '#cbd5e1', 
                        color: 'white', 
                        border: 'none', 
                        padding: '10px', 
                        borderRadius: '8px', 
                        fontWeight: 'bold', 
                        width: '100%', 
                        cursor: esCuentaSolicitada ? 'pointer' : 'not-allowed', 
                        fontSize: '0.875rem', 
                        boxShadow: esCuentaSolicitada ? '0 2px 6px rgba(220, 38, 38, 0.3)' : 'none' 
                      }}
                    >
                      {esCuentaSolicitada ? 'Cobrar y Liberar Mesa 💳' : 'Esperando cuenta... ⏳'}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  }

  // ================= VISTA CLIENTE / MENÚ DIGITAL =================
  if (mesaLiberada) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc', padding: '20px', fontFamily: 'sans-serif' }}>
        <div style={{ background: 'white', padding: '40px', borderRadius: '20px', boxShadow: '0 10px 25px rgba(0,0,0,0.05)', textAlign: 'center', maxWidth: '450px', width: '100%', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '3.5rem', marginBottom: '16px' }}>✨</div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: '900', color: '#0f172a', margin: '0 0 12px 0' }}>¡Gracias por compartir con nosotros!</h1>
          <p style={{ fontSize: '1rem', color: '#64748b', lineHeight: '1.5', margin: 0 }}>Esperamos que vuelva pronto.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', color: '#1e293b', paddingBottom: '80px' }}>
      <header style={{ background: 'white', borderBottom: '1px solid #e2e8f0', position: 'sticky', top: 0, zIndex: 30, padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: '900', margin: 0, color: '#0f172a' }}>Brasa</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <p style={{ fontSize: '0.875rem', fontWeight: '600', color: '#d97706', margin: 0 }}>Mesa #{mesa} • Menú Digital</p>
            <span style={{ color: '#cbd5e1' }}>|</span>
            <a href="/admin" style={{ fontSize: '0.75rem', color: '#64748b', textDecoration: 'none', fontWeight: '600' }}>Admin 🍳</a>
          </div>
        </div>
        
        <button 
          onClick={() => setModalCarrito(true)}
          style={{ position: 'relative', background: '#0f172a', color: 'white', padding: '12px', borderRadius: '50%', border: 'none', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
        >
          🛒
          {carrito.length > 0 && (
            <span style={{ position: 'absolute', top: '-4px', right: '-4px', background: '#f59e0b', color: 'white', fontSize: '0.75rem', fontWeight: 'bold', width: '20px', height: '20px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {carrito.reduce((acc, item) => acc + item.cantidad, 0)}
            </span>
          )}
        </button>
      </header>

      <main style={{ maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
        <section style={{ marginBottom: '24px' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#0f172a', margin: '0 0 4px 0' }}>Nuestra carta</h2>
          <p style={{ fontSize: '0.875rem', color: '#64748b', margin: 0 }}>Selecciona tus categorías favoritas</p>
        </section>

        {/* Categorías */}
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '16px', marginBottom: '16px' }}>
          {['Comida', 'Bebidas', 'Postres'].map(cat => (
            <button
              key={cat}
              onClick={() => setCategoriaActiva(cat)}
              style={{
                padding: '8px 20px',
                borderRadius: '9999px',
                fontWeight: '600',
                fontSize: '0.875rem',
                border: categoriaActiva === cat ? 'none' : '1px solid #cbd5e1',
                background: categoriaActiva === cat ? '#f59e0b' : 'white',
                color: categoriaActiva === cat ? 'white' : '#475569',
                cursor: 'pointer',
                boxShadow: categoriaActiva === cat ? '0 4px 12px rgba(245, 158, 11, 0.3)' : 'none',
                transition: 'all 0.2s'
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Lista de Productos */}
        <div style={{ display: 'grid', gap: '16px', marginBottom: '32px' }}>
          {productosFiltrados.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 0', background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
              <p style={{ color: '#94a3b8', margin: 0 }}>No hay productos disponibles en esta categoría.</p>
            </div>
          ) : (
            productosFiltrados.map(prod => {
              const prodId = prod.id || prod.codigo;
              const prodNombre = prod.nombre || prod.name;
              const prodDesc = prod.descripcion || prod.description;
              const prodPrecio = Number(prod.precio || prod.price || 0);
              const prodImagen = prod.imagen || prod.image;

              return (
                <div key={prodId} style={{ background: 'white', borderRadius: '16px', padding: '16px', border: '1px solid #e2e8f0', display: 'flex', gap: '16px', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                  {prodImagen && (
                    <img src={prodImagen} alt={prodNombre} style={{ width: '96px', height: '96px', objectFit: 'cover', borderRadius: '12px', flexShrink: 0 }} />
                  )}
                  <div style={{ flex: 1 }}>
                    <h3 style={{ fontWeight: 'bold', fontSize: '1rem', color: '#0f172a', margin: '0 0 4px 0' }}>{prodNombre}</h3>
                    <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '0 0 12px 0', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{prodDesc}</p>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontWeight: '800', fontSize: '1rem', color: '#0f172a' }}>Q {prodPrecio.toFixed(2)}</span>
                      <button
                        onClick={() => agregarAlCarrito(prod)}
                        disabled={cuentaSolicitada}
                        style={{ background: cuentaSolicitada ? '#94a3b8' : '#f59e0b', color: 'white', border: 'none', fontWeight: 'bold', padding: '8px 16px', borderRadius: '12px', fontSize: '0.75rem', cursor: cuentaSolicitada ? 'not-allowed' : 'pointer', boxShadow: cuentaSolicitada ? 'none' : '0 2px 6px rgba(245, 158, 11, 0.3)' }}
                      >
                        {cuentaSolicitada ? 'Cuenta pedida 🧾' : 'Añadir +'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Botón Solicitar Cuenta al final de la página */}
        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <button
            onClick={solicitarCuenta}
            disabled={cuentaSolicitada}
            style={{
              width: '100%',
              maxWidth: '300px',
              background: cuentaSolicitada ? '#64748b' : '#dc2626',
              color: 'white',
              border: 'none',
              padding: '14px 20px',
              borderRadius: '12px',
              fontWeight: 'bold',
              fontSize: '1rem',
              cursor: cuentaSolicitada ? 'not-allowed' : 'pointer',
              boxShadow: cuentaSolicitada ? 'none' : '0 4px 12px rgba(220, 38, 38, 0.3)'
            }}
          >
            {cuentaSolicitada ? 'Cuenta Solicitada 🧾' : 'Solicitar Cuenta 🧾'}
          </button>
        </div>
      </main>

      {/* Modal / Carrito */}
      {modalCarrito && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.5)', zIndex: 50, display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ background: 'white', width: '100%', maxWidth: '400px', height: '100%', display: 'flex', flexDirection: 'column', boxShadow: '-10px 0 30px rgba(0,0,0,0.1)' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
              <h3 style={{ fontWeight: 'bold', fontSize: '1.125rem', color: '#0f172a', margin: 0 }}>Tu Orden (Mesa #{mesa})</h3>
              <button onClick={() => setModalCarrito(false)} style={{ background: 'none', border: 'none', color: '#64748b', fontWeight: 'bold', fontSize: '1.25rem', cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
              {ordenEnviada ? (
                <div style={{ textAlign: 'center', padding: '64px 0' }}>
                  <div style={{ fontSize: '3rem', marginBottom: '12px' }}>🎉</div>
                  <h4 style={{ fontWeight: 'bold', fontSize: '1.25rem', color: '#0f172a', margin: '0 0 8px 0' }}>¡Pedido enviado con éxito!</h4>
                  <p style={{ fontSize: '0.875rem', color: '#64748b', margin: 0 }}>La cocina ya recibió tu orden. ¡Buen provecho!</p>
                </div>
              ) : cuentaSolicitada ? (
                <div style={{ textAlign: 'center', padding: '48px 0' }}>
                  <div style={{ fontSize: '3rem', marginBottom: '12px' }}>🧾</div>
                  <h4 style={{ fontWeight: 'bold', fontSize: '1.25rem', color: '#0f172a', margin: '0 0 8px 0' }}>Cuenta Solicitada</h4>
                  <p style={{ fontSize: '0.875rem', color: '#64748b', margin: 0 }}>Has solicitado tu cuenta. Un mesero se acercará a cobrar a tu mesa en breve.</p>
                </div>
              ) : carrito.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '64px 0', color: '#94a3b8' }}>
                  <p style={{ fontSize: '2.5rem', margin: '0 0 8px 0' }}>🛒</p>
                  <p style={{ margin: 0 }}>Tu carrito está vacío</p>
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
                    {carrito.map(item => (
                      <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                        <div>
                          <h5 style={{ fontWeight: 'bold', fontSize: '0.875rem', color: '#1e293b', margin: '0 0 2px 0' }}>{item.nombre}</h5>
                          <p style={{ fontSize: '0.75rem', color: '#64748b', margin: 0 }}>Q {Number(item.precio).toFixed(2)} c/u</p>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <button onClick={() => cambiarCantidad(item.id, -1)} style={{ width: '28px', height: '28px', background: 'white', border: '1px solid #cbd5e1', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>-</button>
                          <span style={{ fontWeight: 'bold', fontSize: '0.875rem', width: '16px', textAlign: 'center' }}>{item.cantidad}</span>
                          <button onClick={() => cambiarCantidad(item.id, 1)} style={{ width: '28px', height: '28px', background: 'white', border: '1px solid #cbd5e1', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>+</button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
                    {/* Campos de Cliente y NIT condicionales */}
                    {!tienePedidoActivo && (
                      <>
                        <div style={{ marginBottom: '12px' }}>
                          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 'bold', color: '#475569', marginBottom: '4px' }}>Cliente <span style={{ color: '#dc2626' }}>*</span></label>
                          <input 
                            type="text" 
                            placeholder="Ej. Juan Pérez"
                            value={nombreCliente}
                            onChange={(e) => setNombreCliente(e.target.value)}
                            required
                            style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '10px', fontSize: '0.875rem', background: '#f8fafc', boxSizing: 'border-box' }}
                          />
                        </div>

                        <div style={{ marginBottom: '16px' }}>
                          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 'bold', color: '#475569', marginBottom: '4px' }}>NIT <span style={{ color: '#dc2626' }}>*</span></label>
                          <input 
                            type="text" 
                            placeholder="Ej. 1234567-8 o C/F"
                            value={nitCliente}
                            onChange={(e) => setNitCliente(e.target.value)}
                            required
                            style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '10px', fontSize: '0.875rem', background: '#f8fafc', boxSizing: 'border-box' }}
                          />
                        </div>
                      </>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1rem', fontWeight: 'bold', color: '#0f172a', marginBottom: '16px' }}>
                      <span>Total a pagar:</span>
                      <span style={{ color: '#d97706' }}>Q {calcularTotal()}</span>
                    </div>

                    <button 
                      onClick={enviarPedido}
                      style={{ width: '100%', background: '#f59e0b', color: 'white', border: 'none', fontWeight: 'bold', padding: '12px', borderRadius: '12px', cursor: 'pointer', boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)' }}
                    >
                      Enviar Pedido a Cocina 🚀
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}