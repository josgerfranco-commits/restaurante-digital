import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { QRCodeCanvas } from 'qrcode.react';
import Despedida from './Despedida';

export default function App() {
  const [ruta, setRuta] = useState('/');
  const [mesa, setMesa] = useState('1');
  
  // Estados para Cliente
  const [productos, setProductos] = useState([]);
  const [categoriaActiva, setCategoriaActiva] = useState('Comida');
  const [carrito, setCarrito] = useState([]);
  const [modalCarrito, setModalCarrito] = useState(false);
  const [nombreCliente, setNombreCliente] = useState('');
  const [nitCliente, setNitCliente] = useState('');
  const [ordenEnviada, setOrdenEnviada] = useState(false);
  const [cuentaSolicitada, setCuentaSolicitada] = useState(false);
  const [tienePedidoActivo, setTienePedidoActivo] = useState(false);
  const [mesaLiberada, setMesaLiberada] = useState(false);

  // Estado para las observaciones del cliente por cada producto
  const [observacionesTemp, setObservacionesTemp] = useState({});

  // Estados para Admin / Cocina / Mesas y Autenticación Supabase
  const [sesion, setSesion] = useState(null);
  const [emailLogin, setEmailLogin] = useState('');
  const [passwordLogin, setPasswordLogin] = useState('');
  const [errorLogin, setErrorLogin] = useState('');
  const [pedidos, setPedidos] = useState([]);
  const [ventasHistoricas, setVentasHistoricas] = useState([]);
  const [loadingAdmin, setLoadingAdmin] = useState(false);

  // Estados para Administrar Productos en Admin (archivo de imagen local)
  const [nuevoProd, setNuevoProd] = useState({ nombre: '', descripcion: '', precio: '', categoria: 'Comida' });
  const [imagenArchivo, setImagenArchivo] = useState(null);

  // Estado para generador de QR
  const [cantidadMesas, setCantidadMesas] = useState(6);

  // Función para navegar sin recargar y manteniendo la misma pestaña
  const navegarA = (nuevaRuta) => {
    window.history.pushState({}, '', nuevaRuta);
    setRuta(nuevaRuta);
  };

  useEffect(() => {
    const rawPath = window.location.pathname.toLowerCase();
    const params = new URLSearchParams(window.location.search);
    const mesaParam = params.get('mesa');
    if (mesaParam) setMesa(mesaParam);

    fetchProductos();

    if (rawPath.includes('admin') || rawPath.includes('cocina') || rawPath.includes('mesas')) {
      if (rawPath.includes('cocina')) {
        setRuta('/cocina');
        fetchPedidos();
      } else if (rawPath.includes('mesas')) {
        setRuta('/mesas');
        fetchPedidos();
      } else {
        setRuta('/admin');
        fetchVentasHistoricas();
      }

      supabase.auth.getSession().then(({ data: { session } }) => {
        setSesion(session);
        if (session) {
          fetchPedidos();
          fetchVentasHistoricas();
        }
      });

      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setSesion(session);
        if (session) {
          fetchPedidos();
          fetchVentasHistoricas();
        }
      });

      return () => subscription.unsubscribe();
    } else if (rawPath.includes('qr')) {
      setRuta('/qr');
    } else {
      setRuta('/');
      verificarEstadoMesa();
    }
  }, [mesa]);

  useEffect(() => {
    const canalProductos = supabase
      .channel('public:productos')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'productos' }, () => {
        fetchProductos();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(canalProductos);
    };
  }, []);

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

  useEffect(() => {
    if ((ruta === '/admin' || ruta === '/cocina' || ruta === '/mesas') && sesion) {
      const canalAdminCocina = supabase
        .channel('public:pedidos')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos' }, () => {
          fetchPedidos();
        })
        .subscribe();

      const canalVentas = supabase
        .channel('public:ventas_historicas')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'ventas_historicas' }, () => {
          fetchVentasHistoricas();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(canalAdminCocina);
        supabase.removeChannel(canalVentas);
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
        const hayCuentaSolicitada = data.some(p => p.estado === 'cuenta_solicitada');
        setCuentaSolicitada(hayCuentaSolicitada);
      } else {
        if (tienePedidoActivo) {
          setMesaLiberada(true);
        }
        setTienePedidoActivo(false);
        setCuentaSolicitada(false);
      }
    } catch {
      setTienePedidoActivo(false);
      setCuentaSolicitada(false);
    }
  };

  const fetchProductos = async () => {
    try {
      const { data, error } = await supabase.from('productos').select('*').order('id', { ascending: false });
      if (error) throw error;
      if (data) setProductos(data);
    } catch (err) {
      console.error('Error al cargar productos:', err);
    }
  };

  const fetchPedidos = async () => {
    try {
      const { data, error } = await supabase
        .from('pedidos')
        .select('*')
        .order('created_at', { ascending: true });
      if (error) throw error;
      if (data) setPedidos(data);
    } catch (err) {
      console.error('Error al cargar pedidos:', err);
    }
  };

  const fetchVentasHistoricas = async () => {
    try {
      const { data, error } = await supabase
        .from('ventas_historicas')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      if (data) setVentasHistoricas(data);
    } catch (err) {
      console.error('Error al cargar historial de ventas:', err);
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
    setVentasHistoricas([]);
  };

  const guardarProducto = async (e) => {
    e.preventDefault();
    if (!nuevoProd.nombre || !nuevoProd.precio) {
      alert('Por favor, ingresa al menos el nombre y el precio.');
      return;
    }

    try {
      let imagenUrl = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=500&q=80';

      if (imagenArchivo) {
        imagenUrl = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.readAsDataURL(imagenArchivo);
        });
      }

      const { error } = await supabase.from('productos').insert([{
        nombre: nuevoProd.nombre,
        descripcion: nuevoProd.descripcion,
        precio: parseFloat(nuevoProd.precio),
        categoria: nuevoProd.categoria,
        imagen: imagenUrl
      }]);

      if (error) throw error;

      setNuevoProd({ nombre: '', descripcion: '', precio: '', categoria: 'Comida' });
      setImagenArchivo(null);
      alert('¡Producto agregado exitosamente al menú!');
      fetchProductos();
    } catch (err) {
      console.error('Error al guardar producto:', err);
      alert('Hubo un error al guardar el producto.');
    }
  };

  const eliminarProducto = async (id) => {
    const confirmar = window.confirm('¿Estás seguro de eliminar este producto del menú?');
    if (!confirmar) return;

    try {
      const { error } = await supabase.from('productos').delete().eq('id', id);
      if (error) throw error;
      fetchProductos();
    } catch (err) {
      console.error('Error al eliminar producto:', err);
      alert('No se pudo eliminar el producto.');
    }
  };

  const despacharOrdenCocina = async (idPedido) => {
    try {
      const { error } = await supabase
        .from('pedidos')
        .update({ estado: 'despachado' })
        .eq('id', idPedido);

      if (error) throw error;
      fetchPedidos();
    } catch (err) {
      console.error('Error al despachar la orden:', err);
      alert('No se pudo marcar la orden como despachada.');
    }
  };

  const liberarMesaGrupo = async (nombreMesa, pedidosMesa, itemsConsolidados, totalMesa) => {
    const clienteMesa = pedidosMesa[0]?.cliente || 'Cliente';

    const confirmar = window.confirm(`¿Deseas cobrar Q ${totalMesa.toFixed(2)} y liberar la ${nombreMesa}?`);
    if (!confirmar) return;

    try {
      const { error: errorVenta } = await supabase.from('ventas_historicas').insert([{
        mesa: nombreMesa,
        cliente: clienteMesa,
        items: itemsConsolidados,
        total: parseFloat(totalMesa)
      }]);

      if (errorVenta) throw errorVenta;

      const idsEliminar = pedidosMesa.map(p => p.id);
      const { error: errorDelete } = await supabase
        .from('pedidos')
        .delete()
        .in('id', idsEliminar);

      if (errorDelete) throw errorDelete;

      fetchPedidos();
      fetchVentasHistoricas();
      alert('¡Mesa cobrada y liberada con éxito!');
    } catch (err) {
      console.error('Error al liberar mesa:', err);
      alert('Hubo un error al procesar el cobro: ' + err.message);
    }
  };

  const agregarAlCarrito = (producto) => {
    const id = producto.id;
    const nombre = producto.nombre;
    const precio = Number(producto.precio || 0);

    const notas = (observacionesTemp[id] || '').trim();
    const cartItemId = `${id}-${notas}`;

    setCarrito(prev => {
      const existe = prev.find(item => item.cartItemId === cartItemId);
      if (existe) {
        return prev.map(item => 
          item.cartItemId === cartItemId ? { ...item, cantidad: item.cantidad + 1 } : item
        );
      }
      return [...prev, { cartItemId, id, nombre, precio, cantidad: 1, notas }];
    });

    setObservacionesTemp(prev => ({ ...prev, [id]: '' }));
  };

  const cambiarCantidad = (cartItemId, delta) => {
    setCarrito(prev => prev.map(item => {
      if (item.cartItemId === cartItemId) {
        const nuevaCantidad = item.cantidad + delta;
        return nuevaCantidad > 0 ? { ...item, cantidad: nuevaCantidad } : null;
      }
      return item;
    }).filter(Boolean));
  };

  const calcularTotal = () => {
    return carrito.reduce((acc, item) => acc + (item.precio * item.cantidad), 0).toFixed(2);
  };

  const enviarPedido = async (e) => {
    e.preventDefault();
    if (carrito.length === 0) return;

    if (!tienePedidoActivo && (!nombreCliente.trim() || !nitCliente.trim())) {
      alert('Por favor, ingresa el nombre del cliente y el NIT antes de enviar tu primer pedido.');
      return;
    }

    try {
      const nombreMesaStr = `Mesa #${mesa}`;

      let infoClienteStr = `${nombreCliente.trim()} (NIT: ${nitCliente.trim()})`;
      const { data: pedidosExistentes } = await supabase
        .from('pedidos')
        .select('cliente')
        .eq('mesa', nombreMesaStr);

      if (pedidosExistentes && pedidosExistentes.length > 0) {
        infoClienteStr = pedidosExistentes[0].cliente;
      }

      const { error: errorInsert } = await supabase.from('pedidos').insert([{
        mesa: nombreMesaStr,
        cliente: infoClienteStr,
        items: carrito,
        total: parseFloat(calcularTotal()),
        estado: 'pendiente'
      }]);

      if (errorInsert) throw errorInsert;

      setTienePedidoActivo(true);
      setOrdenEnviada(true);
      setCarrito([]);
      setCuentaSolicitada(false);

      setTimeout(() => {
        setOrdenEnviada(false);
        setModalCarrito(false);
      }, 4000);

    } catch (err) {
      console.error('Error al enviar pedido:', err);
      alert(`Hubo un error al enviar tu pedido: ${err.message}`);
    }
  };

  const solicitarCuenta = async () => {
    const confirmar = window.confirm('¿Deseas solicitar tu cuenta al mesero?');
    if (!confirmar) return;

    try {
      const nombreMesaStr = `Mesa #${mesa}`;
      await supabase
        .from('pedidos')
        .update({ estado: 'cuenta_solicitada' })
        .eq('mesa', nombreMesaStr);

      setCuentaSolicitada(true);
    } catch (err) {
      console.error('Error al solicitar cuenta:', err);
    }
  };

  const productosFiltrados = productos.filter(p => {
    const cat = p.categoria || 'Comida';
    return cat.toLowerCase() === categoriaActiva.toLowerCase();
  });

  // ================= VISTA DETALLE DE MESAS (/mesas) =================
  if (ruta === '/mesas') {
    if (!sesion) {
      return (
        <div style={{ maxWidth: '400px', margin: '80px auto', background: 'white', padding: '30px', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', border: '1px solid #e2e8f0', fontFamily: 'sans-serif' }}>
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#0f172a', margin: '0 0 4px 0' }}>Detalle de Mesas 🪑</h2>
            <p style={{ fontSize: '0.75rem', color: '#64748b', margin: 0 }}>Inicia sesión para ver el detalle de las mesas</p>
          </div>
          {errorLogin && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '10px', borderRadius: '8px', fontSize: '0.75rem', marginBottom: '16px', textAlign: 'center' }}>
              {errorLogin}
            </div>
          )}
          <form onSubmit={manejarLogin}>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 'bold', color: '#475569', marginBottom: '4px' }}>Correo Electrónico</label>
              <input type="email" value={emailLogin} onChange={(e) => setEmailLogin(e.target.value)} required style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '10px', boxSizing: 'border-box' }} />
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 'bold', color: '#475569', marginBottom: '4px' }}>Contraseña</label>
              <input type="password" value={passwordLogin} onChange={(e) => setPasswordLogin(e.target.value)} required style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '10px', boxSizing: 'border-box' }} />
            </div>
            <button type="submit" disabled={loadingAdmin} style={{ width: '100%', background: '#0f172a', color: 'white', border: 'none', padding: '12px', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' }}>
              {loadingAdmin ? 'Verificando...' : 'Ingresar'}
            </button>
          </form>
        </div>
      );
    }

    const mesasAgrupadas = pedidos.reduce((acc, p) => {
      if (!acc[p.mesa]) acc[p.mesa] = [];
      acc[p.mesa].push(p);
      return acc;
    }, {});

    return (
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px', fontFamily: 'sans-serif' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #e2e8f0', paddingBottom: '15px', marginBottom: '25px' }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: '900', margin: '0 0 4px 0', color: '#0f172a' }}>Ficha de Mesas 🪑</h1>
            <p style={{ fontSize: '0.875rem', color: '#64748b', margin: 0 }}>Gestión y cobro de mesas activas (Consolidado)</p>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={() => navegarA('/admin')} style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '8px', fontWeight: 'bold', fontSize: '0.875rem', display: 'flex', alignItems: 'center', cursor: 'pointer' }}>Ir al Panel Admin 🛠️</button>
            <button onClick={cerrarSesion} style={{ background: '#ef4444', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.875rem' }}>Cerrar Sesión</button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
          {Object.keys(mesasAgrupadas).length === 0 ? (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px', background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
              <p style={{ fontSize: '1.2rem', color: '#94a3b8', margin: 0 }}>No hay mesas ocupadas en este momento.</p>
            </div>
          ) : (
            Object.entries(mesasAgrupadas).map(([nombreMesa, listaPedidos]) => {
              const esCuentaSolicitada = listaPedidos.some(p => p.estado === 'cuenta_solicitada');
              const cliente = listaPedidos[0]?.cliente || 'Cliente';
              const totalAcumulado = listaPedidos.reduce((acc, p) => acc + Number(p.total || 0), 0);
              
              const mapaConsolidado = {};
              listaPedidos.flatMap(p => p.items || []).forEach(item => {
                const key = `${item.nombre}-${(item.notas || '').trim()}`;
                if (mapaConsolidado[key]) {
                  mapaConsolidado[key].cantidad += item.cantidad;
                } else {
                  mapaConsolidado[key] = { ...item };
                }
              });

              const itemsConsolidados = Object.values(mapaConsolidado);

              return (
                <div key={nombreMesa} style={{ background: 'white', borderRadius: '16px', boxShadow: '0 4px 15px rgba(0,0,0,0.06)', border: esCuentaSolicitada ? '2px solid #dc2626' : '1px solid #e2e8f0', padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <span style={{ fontWeight: '900', color: '#d97706', fontSize: '1.25rem' }}>{nombreMesa}</span>
                      <span style={{ fontSize: '0.75rem', background: esCuentaSolicitada ? '#fee2e2' : '#dcfce7', color: esCuentaSolicitada ? '#991b1b' : '#166534', padding: '4px 10px', borderRadius: '6px', fontWeight: 'bold' }}>
                        {esCuentaSolicitada ? '⚠ CUENTA SOLICITADA' : 'Activa 🟢'}
                      </span>
                    </div>

                    <p style={{ fontSize: '0.875rem', fontWeight: 'bold', color: '#1e293b', marginBottom: '12px', background: '#f8fafc', padding: '8px', borderRadius: '8px' }}>
                      👤 {cliente}
                    </p>

                    <ul style={{ fontSize: '0.875rem', color: '#334155', listStyle: 'none', padding: 0, margin: '0 0 16px 0', borderTop: '1px solid #f1f5f9', borderBottom: '1px solid #f1f5f9', padding: '10px 0' }}>
                      {itemsConsolidados.map((item, idx) => (
                        <li key={idx} style={{ marginBottom: '8px', borderBottom: idx < itemsConsolidados.length - 1 ? '1px dashed #f1f5f9' : 'none', paddingBottom: '6px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                            <span>{item.cantidad}x {item.nombre}</span>
                            <span>Q {(item.precio * item.cantidad).toFixed(2)}</span>
                          </div>
                          {item.notas && (
                            <div style={{ fontSize: '0.75rem', color: '#dc2626', fontWeight: 'bold', marginTop: '3px' }}>
                              📝 Obs: {item.notas}
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '1rem', marginBottom: '16px' }}>
                      <span>Total acumulado:</span>
                      <span style={{ color: '#d97706' }}>Q {totalAcumulado.toFixed(2)}</span>
                    </div>

                    <button 
                      onClick={() => liberarMesaGrupo(nombreMesa, listaPedidos, itemsConsolidados, totalAcumulado)}
                      disabled={!esCuentaSolicitada}
                      style={{ 
                        background: esCuentaSolicitada ? '#dc2626' : '#cbd5e1', 
                        color: 'white', 
                        border: 'none', 
                        padding: '12px', 
                        borderRadius: '10px', 
                        fontWeight: 'bold', 
                        width: '100%', 
                        cursor: esCuentaSolicitada ? 'pointer' : 'not-allowed', 
                        fontSize: '0.875rem' 
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

  // ================= VISTA GENERADOR DE QR (/qr) =================
  if (ruta === '/qr') {
    const baseUrl = window.location.origin;
    return (
      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '30px 20px', fontFamily: 'sans-serif' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #e2e8f0', paddingBottom: '15px', marginBottom: '25px' }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: '900', margin: '0 0 4px 0', color: '#0f172a' }}>Generador de Códigos QR 📱</h1>
            <p style={{ fontSize: '0.875rem', color: '#64748b', margin: 0 }}>Crea y descarga los códigos QR para cada mesa</p>
          </div>
          <button onClick={() => navegarA('/')} style={{ background: '#0f172a', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '8px', fontWeight: 'bold', fontSize: '0.875rem', cursor: 'pointer' }}>Ir al Menú</button>
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
                  <QRCodeCanvas id={`qr-mesa-${numeroMesa}`} value={urlMesa} size={150} level={"H"} includeMargin={true} />
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
                  style={{ width: '100%', background: '#f59e0b', color: 'white', border: 'none', padding: '10px', borderRadius: '10px', fontWeight: 'bold', fontSize: '0.75rem', cursor: 'pointer' }}
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

  // ================= VISTA COCINA SEPARADA (/cocina) =================
  if (ruta === '/cocina') {
    if (!sesion) {
      return (
        <div style={{ maxWidth: '400px', margin: '80px auto', background: 'white', padding: '30px', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', border: '1px solid #e2e8f0', fontFamily: 'sans-serif' }}>
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#0f172a', margin: '0 0 4px 0' }}>Pantalla de Cocina 🍳</h2>
            <p style={{ fontSize: '0.75rem', color: '#64748b', margin: 0 }}>Inicia sesión para ver las órdenes</p>
          </div>
          {errorLogin && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '10px', borderRadius: '8px', fontSize: '0.75rem', marginBottom: '16px', textAlign: 'center' }}>
              {errorLogin}
            </div>
          )}
          <form onSubmit={manejarLogin}>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 'bold', color: '#475569', marginBottom: '4px' }}>Correo Electrónico</label>
              <input type="email" value={emailLogin} onChange={(e) => setEmailLogin(e.target.value)} required style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '10px', boxSizing: 'border-box' }} />
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 'bold', color: '#475569', marginBottom: '4px' }}>Contraseña</label>
              <input type="password" value={passwordLogin} onChange={(e) => setPasswordLogin(e.target.value)} required style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '10px', boxSizing: 'border-box' }} />
            </div>
            <button type="submit" disabled={loadingAdmin} style={{ width: '100%', background: '#0f172a', color: 'white', border: 'none', padding: '12px', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' }}>
              {loadingAdmin ? 'Verificando...' : 'Ingresar'}
            </button>
          </form>
        </div>
      );
    }

    const ordenesPendientes = pedidos.filter(p => p.estado === 'pendiente');

    return (
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px', fontFamily: 'sans-serif' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #e2e8f0', paddingBottom: '15px', marginBottom: '25px' }}>
          <div>
            <h1 style={{ fontSize: '2rem', fontWeight: '900', margin: '0 0 4px 0', color: '#0f172a' }}>Pantalla de Cocina 🍳</h1>
            <p style={{ fontSize: '1rem', color: '#64748b', margin: 0 }}>Monitoreo de comandas en tiempo real</p>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={() => navegarA('/admin')} style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '10px 18px', borderRadius: '8px', fontWeight: 'bold', fontSize: '1rem', display: 'flex', alignItems: 'center', cursor: 'pointer' }}>Ir al Panel Admin 🛠️</button>
            <button onClick={cerrarSesion} style={{ background: '#ef4444', color: 'white', border: 'none', padding: '10px 18px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '1rem' }}>Cerrar Sesión</button>
          </div>
        </div>

        {ordenesPendientes.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 20px', background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
            <p style={{ fontSize: '1.4rem', color: '#94a3b8', margin: 0 }}>Sin comandas pendientes por mostrar en cocina por el momento.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '24px' }}>
            {ordenesPendientes.map((pedido) => {
              const horaEnvio = pedido.created_at 
                ? new Date(pedido.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
                : '';

              const pedidosDeEstaMesa = pedidos.filter(p => p.mesa === pedido.mesa);
              const numeroPedido = pedidosDeEstaMesa.findIndex(p => p.id === pedido.id) + 1;

              return (
                <div 
                  key={pedido.id} 
                  style={{ 
                    background: 'white', 
                    borderRadius: '16px', 
                    boxShadow: '0 4px 18px rgba(0,0,0,0.08)', 
                    border: '2px solid #cbd5e1', 
                    padding: '24px', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    justifyContent: 'space-between' 
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <span style={{ fontSize: '1.6rem', fontWeight: '900', color: '#d97706' }}>
                        {pedido.mesa}
                      </span>
                      <span style={{ fontSize: '1rem', background: '#fef3c7', color: '#b45309', padding: '6px 12px', borderRadius: '8px', fontWeight: '800' }}>
                        {horaEnvio} 🕒
                      </span>
                    </div>

                    <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#0f172a', marginBottom: '14px' }}>
                      Pedido #{numeroPedido}
                    </div>

                    <p style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#334155', marginBottom: '16px', background: '#f8fafc', padding: '10px 14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                      👤 {pedido.cliente}
                    </p>

                    <ul style={{ fontSize: '1.2rem', color: '#1e293b', listStyle: 'none', padding: 0, margin: '0 0 20px 0', borderTop: '2px solid #f1f5f9', borderBottom: '2px solid #f1f5f9', padding: '12px 0' }}>
                      {pedido.items && pedido.items.map((item, idx) => (
                        <li key={idx} style={{ marginBottom: '10px', borderBottom: idx < pedido.items.length - 1 ? '1px dashed #e2e8f0' : 'none', paddingBottom: '8px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                            <span>{item.cantidad}x {item.nombre}</span>
                            <span>Q {(item.precio * item.cantidad).toFixed(2)}</span>
                          </div>
                          {item.notas && (
                            <div style={{ fontSize: '0.9rem', color: '#dc2626', fontWeight: 'bold', marginTop: '4px' }}>
                              📝 Obs: {item.notas}
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <button 
                    onClick={() => despacharOrdenCocina(pedido.id)}
                    style={{ 
                      background: '#10b981', 
                      color: 'white', 
                      border: 'none', 
                      padding: '14px', 
                      borderRadius: '12px', 
                      fontWeight: 'bold', 
                      width: '100%', 
                      cursor: 'pointer', 
                      fontSize: '1rem',
                      boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)' 
                    }}
                  >
                    Marcar como Despachado ✓
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ================= VISTA DE ADMIN PRINCIPAL (/admin) =================
  if (ruta === '/admin') {
    if (!sesion) {
      return (
        <div style={{ maxWidth: '400px', margin: '80px auto', background: 'white', padding: '30px', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', border: '1px solid #e2e8f0', fontFamily: 'sans-serif' }}>
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#0f172a', margin: '0 0 4px 0' }}>Panel de Administración 🛠️</h2>
            <p style={{ fontSize: '0.75rem', color: '#64748b', margin: 0 }}>Inicia sesión como administrador</p>
          </div>
          {errorLogin && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '10px', borderRadius: '8px', fontSize: '0.75rem', marginBottom: '16px', textAlign: 'center' }}>
              {errorLogin}
            </div>
          )}
          <form onSubmit={manejarLogin}>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 'bold', color: '#475569', marginBottom: '4px' }}>Correo Electrónico</label>
              <input type="email" value={emailLogin} onChange={(e) => setEmailLogin(e.target.value)} required style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '10px', boxSizing: 'border-box' }} />
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 'bold', color: '#475569', marginBottom: '4px' }}>Contraseña</label>
              <input type="password" value={passwordLogin} onChange={(e) => setPasswordLogin(e.target.value)} required style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '10px', boxSizing: 'border-box' }} />
            </div>
            <button type="submit" disabled={loadingAdmin} style={{ width: '100%', background: '#0f172a', color: 'white', border: 'none', padding: '12px', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' }}>
              {loadingAdmin ? 'Verificando...' : 'Ingresar'}
            </button>
          </form>
        </div>
      );
    }

    const totalVentasHistoricas = ventasHistoricas.reduce((acc, v) => acc + Number(v.total || 0), 0);

    // Agrupar productos por categoría para el panel de administración
    const productosPorCategoria = productos.reduce((acc, p) => {
      const cat = p.categoria || 'Comida';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(p);
      return acc;
    }, {});

    return (
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px', fontFamily: 'sans-serif' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #e2e8f0', paddingBottom: '15px', marginBottom: '25px' }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: '900', margin: '0 0 4px 0', color: '#0f172a' }}>Panel de Administración 🛠️</h1>
            <p style={{ fontSize: '0.875rem', color: '#64748b', margin: 0 }}>Gestión de productos del menú y control general</p>
          </div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button onClick={() => navegarA('/cocina')} style={{ background: '#f59e0b', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '8px', fontWeight: 'bold', fontSize: '0.875rem', cursor: 'pointer' }}>Ver Cocina 🍳</button>
            <button onClick={() => navegarA('/mesas')} style={{ background: '#10b981', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '8px', fontWeight: 'bold', fontSize: '0.875rem', cursor: 'pointer' }}>Ver Mesas 🪑</button>
            <button onClick={() => navegarA('/qr')} style={{ background: '#8b5cf6', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '8px', fontWeight: 'bold', fontSize: '0.875rem', cursor: 'pointer' }}>Generar QRs 📱</button>
            <button onClick={cerrarSesion} style={{ background: '#ef4444', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '8px', fontWeight: 'bold', fontSize: '0.875rem', cursor: 'pointer' }}>Cerrar Sesión</button>
          </div>
        </div>

        {/* Resumen de Ventas Históricas */}
        <div style={{ background: 'white', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0', marginBottom: '30px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#0f172a', margin: '0 0 10px 0' }}>💰 Resumen de Caja y Ventas Históricas</h3>
          <p style={{ fontSize: '1.25rem', fontWeight: '900', color: '#d97706', margin: '0 0 16px 0' }}>Total Acumulado Cobrado: Q {totalVentasHistoricas.toFixed(2)}</p>
          
          <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
            {ventasHistoricas.length === 0 ? (
              <p style={{ fontSize: '0.85rem', color: '#94a3b8', margin: 0 }}>Aún no hay registros de ventas anteriores.</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', color: '#475569', textAlign: 'left' }}>
                    <th style={{ padding: '8px' }}>Mesa</th>
                    <th style={{ padding: '8px' }}>Cliente</th>
                    <th style={{ padding: '8px' }}>Total</th>
                    <th style={{ padding: '8px' }}>Fecha / Hora</th>
                  </tr>
                </thead>
                <tbody>
                  {ventasHistoricas.map((v, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '8px', fontWeight: 'bold' }}>{v.mesa}</td>
                      <td style={{ padding: '8px' }}>{v.cliente}</td>
                      <td style={{ padding: '8px', fontWeight: 'bold', color: '#d97706' }}>Q {Number(v.total).toFixed(2)}</td>
                      <td style={{ padding: '8px', color: '#64748b' }}>{new Date(v.created_at).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Formulario para Agregar Producto con Subida de Archivo Local */}
        <div style={{ background: 'white', padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0', marginBottom: '30px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#0f172a', margin: '0 0 16px 0' }}>Agregar Nuevo Platillo o Bebida ➕</h3>
          <form onSubmit={guardarProducto} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', alignItems: 'flex-end' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 'bold', color: '#475569', marginBottom: '4px' }}>Nombre</label>
              <input type="text" placeholder="Ej. Lomo Saltado" value={nuevoProd.nombre} onChange={(e) => setNuevoProd({ ...nuevoProd, nombre: e.target.value })} required style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '10px', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 'bold', color: '#475569', marginBottom: '4px' }}>Descripción</label>
              <input type="text" placeholder="Ej. Jugoso corte..." value={nuevoProd.descripcion} onChange={(e) => setNuevoProd({ ...nuevoProd, descripcion: e.target.value })} style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '10px', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 'bold', color: '#475569', marginBottom: '4px' }}>Precio (Q)</label>
              <input type="number" step="0.01" placeholder="75.00" value={nuevoProd.precio} onChange={(e) => setNuevoProd({ ...nuevoProd, precio: e.target.value })} required style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '10px', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 'bold', color: '#475569', marginBottom: '4px' }}>Categoría</label>
              <select value={nuevoProd.categoria} onChange={(e) => setNuevoProd({ ...nuevoProd, categoria: e.target.value })} style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '10px', boxSizing: 'border-box', background: 'white' }}>
                <option value="Comida">Comida</option>
                <option value="Bebidas">Bebidas</option>
                <option value="Postres">Postres</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 'bold', color: '#475569', marginBottom: '4px' }}>Subir Imagen de la PC</label>
              <input 
                type="file" 
                accept="image/*" 
                onChange={(e) => setImagenArchivo(e.target.files[0])} 
                style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '10px', fontSize: '0.8rem', background: '#f8fafc', boxSizing: 'border-box' }} 
              />
            </div>
            <button type="submit" style={{ background: '#0f172a', color: 'white', border: 'none', padding: '11px', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' }}>Guardar Platillo</button>
          </form>
        </div>

        {/* Listado de Productos Actuales Ordenados por Categoría */}
        <h3 style={{ fontSize: '1.3rem', fontWeight: '900', color: '#0f172a', marginBottom: '20px' }}>Platillos en el Menú Actual (Ordenados por Categoría)</h3>
        
        {Object.keys(productosPorCategoria).length === 0 ? (
          <p style={{ color: '#94a3b8' }}>No hay productos en el menú.</p>
        ) : (
          Object.entries(productosPorCategoria).map(([categoria, listaProds]) => (
            <div key={categoria} style={{ marginBottom: '30px' }}>
              <h4 style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#d97706', borderBottom: '2px solid #e2e8f0', paddingBottom: '6px', marginBottom: '14px' }}>
                🍽️ {categoria}
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                {listaProds.map(p => (
                  <div key={p.id} style={{ background: 'white', borderRadius: '12px', padding: '16px', border: '1px solid #e2e8f0', display: 'flex', gap: '12px', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
                    <img src={p.imagen} alt={p.nombre} style={{ width: '70px', height: '70px', objectFit: 'cover', borderRadius: '8px' }} />
                    <div style={{ flex: 1 }}>
                      <h4 style={{ fontWeight: 'bold', fontSize: '0.95rem', margin: '0 0 2px 0', color: '#0f172a' }}>{p.nombre}</h4>
                      <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '0 0 6px 0' }}>Q {Number(p.precio).toFixed(2)}</p>
                      <button onClick={() => eliminarProducto(p.id)} style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', padding: '4px 8px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 'bold', cursor: 'pointer' }}>Eliminar</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    );
  }

  // ================= PANTALLA DE DESPEDIDA / MESA LIBERADA =================
  if (mesaLiberada) {
    return <Despedida />;
  }

  // ================= PANTALLA DE ESPERA (CUENTA SOLICITADA) =================
  if (cuentaSolicitada) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc', padding: '20px', fontFamily: 'sans-serif' }}>
        <div style={{ background: 'white', padding: '40px', borderRadius: '20px', boxShadow: '0 10px 25px rgba(0,0,0,0.05)', textAlign: 'center', maxWidth: '450px', width: '100%', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '3.5rem', marginBottom: '16px' }}>✨</div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: '900', color: '#0f172a', margin: '0 0 12px 0' }}>¡Gracias por preferirnos!</h1>
          <p style={{ fontSize: '1rem', color: '#64748b', lineHeight: '1.5', margin: 0 }}>
            En un momento llegará un mesero a cobrar.<br />
            El código QR ha quedado listo para liberar.
          </p>
        </div>
      </div>
    );
  }

  // ================= VISTA CLIENTE / MENÚ DIGITAL =================
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', color: '#1e293b', paddingBottom: '80px', fontFamily: 'sans-serif' }}>
      <header style={{ background: 'white', borderBottom: '1px solid #e2e8f0', position: 'sticky', top: 0, zIndex: 30, padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: '900', margin: 0, color: '#0f172a' }}>Terra Viva</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <p style={{ fontSize: '0.875rem', fontWeight: '600', color: '#d97706', margin: 0 }}>Mesa #{mesa} • Menú Digital</p>
            <span style={{ color: '#cbd5e1' }}>|</span>
            <a href="/admin" style={{ fontSize: '0.75rem', color: '#64748b', textDecoration: 'none', fontWeight: '600' }}>Admin 🛠️</a>
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
              const prodId = prod.id;
              const prodNombre = prod.nombre;
              const prodDesc = prod.descripcion;
              const prodPrecio = Number(prod.precio || 0);
              const prodImagen = prod.imagen;
              const obsActual = observacionesTemp[prodId] || '';

              return (
                <div key={prodId} style={{ background: 'white', borderRadius: '16px', padding: '16px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                  <div style={{ display: 'flex', gap: '16px', alignItems: 'center', justifyContent: 'space-between' }}>
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
                          style={{ background: '#f59e0b', color: 'white', border: 'none', fontWeight: 'bold', padding: '8px 16px', borderRadius: '12px', fontSize: '0.75rem', cursor: 'pointer', boxShadow: '0 2px 6px rgba(245, 158, 11, 0.3)' }}
                        >
                          Añadir +
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Input de Observaciones por platillo */}
                  <input 
                    type="text" 
                    placeholder="Observaciones (ej. Sin cebolla, término medio...)" 
                    value={obsActual}
                    onChange={(e) => setObservacionesTemp({ ...observacionesTemp, [prodId]: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.75rem', boxSizing: 'border-box', background: '#f8fafc' }}
                  />
                </div>
              );
            })
          )}
        </div>

        {/* Botón Solicitar Cuenta al final de la página */}
        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <button
            onClick={solicitarCuenta}
            style={{
              width: '100%',
              maxWidth: '300px',
              background: '#dc2626',
              color: 'white',
              border: 'none',
              padding: '14px 20px',
              borderRadius: '12px',
              fontWeight: 'bold',
              fontSize: '1rem',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(220, 38, 38, 0.3)'
            }}
          >
            Solicitar Cuenta 🧾
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
              ) : carrito.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '64px 0', color: '#94a3b8' }}>
                  <p style={{ fontSize: '2.5rem', margin: '0 0 8px 0' }}>🛒</p>
                  <p style={{ margin: 0 }}>Tu carrito está vacío</p>
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
                    {carrito.map(item => (
                      <div key={item.cartItemId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                        <div>
                          <h5 style={{ fontWeight: 'bold', fontSize: '0.875rem', color: '#1e293b', margin: '0 0 2px 0' }}>{item.nombre}</h5>
                          <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '0 0 2px 0' }}>Q {Number(item.precio).toFixed(2)} c/u</p>
                          {item.notas && (
                            <p style={{ fontSize: '0.7rem', color: '#dc2626', fontWeight: 'bold', margin: 0 }}>Obs: {item.notas}</p>
                          )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <button onClick={() => cambiarCantidad(item.cartItemId, -1)} style={{ width: '28px', height: '28px', background: 'white', border: '1px solid #cbd5e1', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>-</button>
                          <span style={{ fontWeight: 'bold', fontSize: '0.875rem', width: '16px', textAlign: 'center' }}>{item.cantidad}</span>
                          <button onClick={() => cambiarCantidad(item.cartItemId, 1)} style={{ width: '28px', height: '28px', background: 'white', border: '1px solid #cbd5e1', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>+</button>
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