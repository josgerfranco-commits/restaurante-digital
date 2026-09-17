import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import './App.css'

function App() {
  const [view, setView] = useState('menu') // 'menu' o 'admin'
  const [tableNumber, setTableNumber] = useState(1)
  
  // Estados para el Menú del Cliente
  const [categories, setCategories] = useState([])
  const [products, setProducts] = useState([])
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [loading, setLoading] = useState(true)
  const [cart, setCart] = useState([])
  const [showCartModal, setShowCartModal] = useState(false)
  const [sending, setSending] = useState(false)

  // Estados para el Panel de Cocina / Admin
  const [session, setSession] = useState(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authLoading, setAuthLoading] = useState(false)
  const [orders, setOrders] = useState([])
  const [adminTab, setAdminTab] = useState('kitchen') // 'kitchen' o 'qr'
  const [totalTables, setTotalTables] = useState(5) // Número de mesas a generar QR

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const vistaParam = params.get('vista')
    const mesaParam = params.get('mesa')

    if (vistaParam === 'admin') {
      setView('admin')
      checkUserSession()
    } else {
      setView('menu')
      if (mesaParam) setTableNumber(mesaParam)
      fetchMenu()
    }
  }, [])

  // --- LÓGICA DE CLIENTE ---
  async function fetchMenu() {
    try {
      setLoading(true)
      const { data: catData, error: catError } = await supabase.from('categories').select('*')
      if (catError) throw catError
      setCategories(catData || [])
      
      if (catData && catData.length > 0) {
        setSelectedCategory(catData[0].id)
      }

      const { data: prodData, error: prodError } = await supabase.from('products').select('*')
      if (prodError) throw prodError
      setProducts(prodData || [])
    } catch (error) {
      console.error('Error cargando menú:', error.message)
    } finally {
      setLoading(false)
    }
  }

  const addToCart = (product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id)
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item)
      }
      return [...prev, { ...product, quantity: 1 }]
    })
  }

  const removeFromCart = (productId) => {
    setCart(prev => prev.map(item => {
      if (item.id === productId) return { ...item, quantity: item.quantity - 1 }
      return item
    }).filter(item => item.quantity > 0))
  }

  const cartTotal = cart.reduce((sum, item) => sum + (Number(item.price) * item.quantity), 0)
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0)

  const sendOrderToKitchen = async () => {
    if (cart.length === 0) return
    try {
      setSending(true)
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert([{ table_number: parseInt(tableNumber), status: 'pending', total: cartTotal }])
        .select()

      if (orderError) throw orderError
      const newOrder = orderData[0]

      const orderItemsToInsert = cart.map(item => ({
        order_id: newOrder.id,
        product_id: item.id,
        quantity: item.quantity,
        price: item.price
      }))

      const { error: itemsError } = await supabase.from('order_items').insert(orderItemsToInsert)
      if (itemsError) throw itemsError

      alert(`¡Pedido enviado con éxito a la Cocina desde la Mesa #${tableNumber}! 🍳`)
      setCart([])
      setShowCartModal(false)
    } catch (error) {
      console.error('Error al enviar orden:', error.message)
      alert('Hubo un error al enviar tu pedido.')
    } finally {
      setSending(false)
    }
  }

  // --- LÓGICA DE ADMIN / COCINA ---
  async function checkUserSession() {
    const { data: { session } } = await supabase.auth.getSession()
    setSession(session)
    if (session) fetchKitchenOrders()

    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) fetchKitchenOrders()
    })
  }

  async function handleLogin(e) {
    e.preventDefault()
    setAuthLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      alert('Error al iniciar sesión: ' + error.message)
    } else {
      fetchKitchenOrders()
    }
    setAuthLoading(false)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    setSession(null)
  }

  async function fetchKitchenOrders() {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          table_number,
          status,
          total,
          created_at,
          order_items (
            id,
            quantity,
            price,
            products (
              name
            )
          )
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: true })

      if (error) throw error
      setOrders(data || [])
    } catch (error) {
      console.error('Error cargando órdenes de cocina:', error.message)
    }
  }

  async function completeOrder(orderId) {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: 'completed' })
        .eq('id', orderId)

      if (error) throw error
      setOrders(prev => prev.filter(o => o.id !== orderId))
    } catch (error) {
      console.error('Error al completar orden:', error.message)
    }
  }

  // --- RENDERIZADO VISTA ADMIN / COCINA ---
  if (view === 'admin') {
    return (
      <div className="admin-container">
        <header className="admin-header">
          <div>
            <h2>🍳 Panel de Control - Brasa</h2>
            <p>Gestión de Cocina y Códigos QR</p>
          </div>
          {session && (
            <button className="logout-btn" onClick={handleLogout}>Cerrar Sesión</button>
          )}
        </header>

        {!session ? (
          <div className="login-card">
            <h3>Acceso Supervisor</h3>
            <p>Ingresa tus credenciales para administrar</p>
            <form onSubmit={handleLogin}>
              <input 
                type="email" 
                placeholder="Correo electrónico" 
                value={email} 
                onChange={e => setEmail(e.target.value)} 
                required 
              />
              <input 
                type="password" 
                placeholder="Contraseña" 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                required 
              />
              <button type="submit" disabled={authLoading}>
                {authLoading ? 'Verificando...' : 'Entrar al Panel'}
              </button>
            </form>
          </div>
        ) : (
          <div className="admin-dashboard">
            {/* Pestañas de navegación de Admin */}
            <div className="admin-tabs">
              <button 
                className={`admin-tab-btn ${adminTab === 'kitchen' ? 'active' : ''}`}
                onClick={() => setAdminTab('kitchen')}
              >
                🍳 Monitor de Cocina
              </button>
              <button 
                className={`admin-tab-btn ${adminTab === 'qr' ? 'active' : ''}`}
                onClick={() => setAdminTab('qr')}
              >
                📱 Generador de Códigos QR
              </button>
            </div>

            {adminTab === 'kitchen' ? (
              <div className="kitchen-dashboard">
                <div className="kitchen-top-bar">
                  <span>Pedidos pendientes de preparación</span>
                  <button className="refresh-btn" onClick={fetchKitchenOrders}>🔄 Actualizar Pedidos</button>
                </div>

                {orders.length === 0 ? (
                  <p className="no-orders">No hay órdenes pendientes en este momento. ¡Todo al día! 👍</p>
                ) : (
                  <div className="orders-grid">
                    {orders.map(order => (
                      <div key={order.id} className="order-card">
                        <div className="order-card-header">
                          <span className="table-badge">Mesa #{order.table_number}</span>
                          <small>{new Date(order.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</small>
                        </div>
                        <div className="order-body">
                          <p className="items-title">Platillos solicitados:</p>
                          <ul className="order-items-list">
                            {order.order_items.map(item => (
                              <li key={item.id}>
                                <span className="item-qty">{item.quantity}x</span> {item.products?.name || 'Producto'}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div className="order-card-footer">
                          <span className="order-total">Total: Q {Number(order.total).toFixed(2)}</span>
                          <button className="complete-btn" onClick={() => completeOrder(order.id)}>
                            Marcar como Lista ✅
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="qr-generator-section">
                <div className="qr-top-bar">
                  <h3>Generador de QR para las Mesas del Restaurante</h3>
                  <p>Descarga o imprime estos códigos para colocarlos en cada mesa física.</p>
                </div>

                <div className="qr-grid">
                  {Array.from({ length: totalTables }, (_, i) => i + 1).map(tableNum => {
                    // Generar URL basada en el dominio actual y la mesa
                    const tableUrl = `${window.location.origin}/?mesa=${tableNum}`
                    const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(tableUrl)}`

                    return (
                      <div key={tableNum} className="qr-card">
                        <h4>Mesa #{tableNum}</h4>
                        <img src={qrApiUrl} alt={`QR Mesa ${tableNum}`} className="qr-image" />
                        <span className="qr-link-text">{tableUrl}</span>
                        <a 
                          href={qrApiUrl} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          download={`QR_Mesa_${tableNum}.png`}
                          className="download-qr-btn"
                        >
                          Descargar QR 📥
                        </a>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  // --- RENDERIZADO VISTA CLIENTE ---
  const filteredProducts = selectedCategory
    ? products.filter(p => p.category_id === selectedCategory)
    : products

  return (
    <div className="mobile-app-container">
      <header className="app-header">
        <div className="header-titles">
          <h1>Brasa</h1>
          <p>Mesa #{tableNumber} • Menú Digital</p>
        </div>
        <div className="cart-icon-btn" onClick={() => setShowCartModal(true)}>
          🛒
          {totalItems > 0 && <span className="cart-badge">{totalItems}</span>}
        </div>
      </header>

      <section className="carta-intro">
        <h2>Nuestra carta</h2>
        <p>Selecciona tus categorías favoritas</p>
      </section>

      <div className="tabs-container">
        {categories.map(cat => (
          <button
            key={cat.id}
            className={`tab-btn ${selectedCategory === cat.id ? 'active' : ''}`}
            onClick={() => setSelectedCategory(cat.id)}
          >
            {cat.name}
          </button>
        ))}
      </div>

      <main className="products-list">
        {loading ? (
          <p className="loading">Cargando carta...</p>
        ) : filteredProducts.length === 0 ? (
          <p className="empty">No hay productos en esta categoría.</p>
        ) : (
          filteredProducts.map(product => (
            <div key={product.id} className="food-card">
              {product.image_url && (
                <img src={product.image_url} alt={product.name} className="food-img" />
              )}
              <div className="food-details">
                <h3>{product.name}</h3>
                <p className="food-desc">{product.description}</p>
                <div className="food-footer">
                  <span className="food-price">Q {Number(product.price).toFixed(2)}</span>
                  <button className="add-card-btn" onClick={() => addToCart(product)}>
                    Añadir +
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </main>

      {cart.length > 0 && (
        <div className="floating-bar" onClick={() => setShowCartModal(true)}>
          <span>Ver mi pedido ({totalItems} items)</span>
          <span className="bar-total">Q {cartTotal.toFixed(2)} ➔</span>
        </div>
      )}

      {showCartModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Tu Pedido - Mesa #{tableNumber}</h3>
              <button className="close-modal" onClick={() => setShowCartModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              {cart.map(item => (
                <div key={item.id} className="modal-item">
                  <div>
                    <h4>{item.name}</h4>
                    <p>Q {Number(item.price).toFixed(2)} x {item.quantity}</p>
                  </div>
                  <div className="modal-controls">
                    <button onClick={() => removeFromCart(item.id)}>-</button>
                    <span>{item.quantity}</span>
                    <button onClick={() => addToCart(item)}>+</button>
                  </div>
                </div>
              ))}
            </div>
            <div className="modal-footer">
              <div className="modal-total-row">
                <span>Total a pagar:</span>
                <strong>Q {cartTotal.toFixed(2)}</strong>
              </div>
              <button 
                className="confirm-order-btn" 
                onClick={sendOrderToKitchen}
                disabled={sending}
              >
                {sending ? 'Enviando...' : 'Enviar Orden a Cocina 🚀'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App