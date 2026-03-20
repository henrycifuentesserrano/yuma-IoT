import React, { useState, useEffect, useRef } from 'react';
import { signIn, signOut, getCurrentUser } from 'aws-amplify/auth';
import { IoTConfig } from './aws-config';
import { PubSub } from '@aws-amplify/pubsub';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { fetchAuthSession } from 'aws-amplify/auth';


// Fix para el icono de Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});


const COLORS = {
  darkBlue: '#0a2342',
  blue: '#1a4a8a',
  green: '#2ecc71',
  lightGreen: '#27ae60',
  white: '#ffffff',
  gray: '#ecf0f1',
  darkGray: '#b0bec5',
  red: '#FF6B6B',
};

const styles = {
  app: {
    minHeight: '100vh',
    backgroundColor: COLORS.darkBlue,
    fontFamily: 'sans-serif',
    color: COLORS.white,
  },
  header: {
    padding: '20px',
    borderBottom: `1px solid ${COLORS.blue}`,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logo: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: COLORS.green,
  },
  subtitle: {
    fontSize: '12px',
    color: COLORS.white,
    marginTop: '2px',
  },
  loginContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    padding: '20px',
    background: 'linear-gradient(160deg, #0a2342 60%, #1a4a8a 100%)',
    overflow: 'hidden',
  },
  loginCard: {
    backgroundColor: COLORS.blue,
    borderRadius: '16px',
    padding: '24px 24px 38px 24px',
    width: '100%',
    maxWidth: '360px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
  },
  input: {
    width: '100%',
    padding: '10px',
    marginBottom: '8px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: COLORS.darkBlue,
    color: COLORS.white,
    fontSize: '16px',
    boxSizing: 'border-box',
  },
  button: {
    width: '100%',
    padding: '12px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: COLORS.green,
    color: COLORS.white,
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    marginBottom: '10px',
  },
  deviceCard: {
    backgroundColor: COLORS.blue,
    borderRadius: '12px',
    padding: '20px',
    margin: '16px',
  },
  deviceName: {
    fontSize: '18px',
    fontWeight: 'bold',
    marginBottom: '8px',
  },
  statusDot: (connected) => ({
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    backgroundColor: connected ? COLORS.green : COLORS.red,
    display: 'inline-block',
    marginRight: '8px',
  }),
  relayButton: (on) => ({
    width: '100%',
    padding: '16px',
    borderRadius: '10px',
    border: 'none',
    backgroundColor: on ? COLORS.green : COLORS.darkGray,
    color: COLORS.white,
    fontSize: '18px',
    fontWeight: 'bold',
    cursor: 'pointer',
    marginTop: '16px',
    transition: 'background-color 0.3s',
  }),
  infoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 0',
    borderBottom: `1px solid ${COLORS.darkBlue}`,
    fontSize: '14px',
  },
  label: {
    color: COLORS.white,
    fontWeight: 'bold',
    fontSize: '15px',
  },
  value: {
    color: COLORS.white,
    fontWeight: 'bold',
  },
  errorText: {
    color: COLORS.red,
    fontSize: '16px',
    textAlign: 'center',
    marginTop: '10px',
  },
};

function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [needsNewPassword, setNeedsNewPassword] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await signIn({ username: email, password });
      console.log('NextStep:', result.nextStep);
      if (result.nextStep?.signInStep === 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED') {
        setNeedsNewPassword(true);
      } else if (result.isSignedIn) {
        onLogin();
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Email o contraseña incorrectos');
    }
    setLoading(false);
  };

  const handleNewPassword = async () => {
    setLoading(true);
    setError('');
    try {
      const { confirmSignIn } = await import('aws-amplify/auth');
      const result = await confirmSignIn({ challengeResponse: newPassword });
      if (result.isSignedIn) {
        onLogin();
      }
    } catch (err) {
      console.error('Error cambiando contraseña:', err);
      setError('Error al cambiar la contraseña. Mínimo 8 caracteres.');
    }
    setLoading(false);
  };

  if (needsNewPassword) {
    return (
      <div style={styles.loginContainer}>
        <div style={styles.loginCard}>
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
  <div style={{ fontSize: '28px', fontWeight: 'bold', color: COLORS.green, lineHeight: '1' }}>YUMA IoT</div>
  	  <div style={{ fontSize: '12px', color: COLORS.white, letterSpacing: '1px' }}>INTELLIGENT SYSTEMS FLOW</div>
	</div>
          <div style={{ color: COLORS.darkGray, fontSize: '14px', marginBottom: '16px', textAlign: 'center' }}>
            Por seguridad debes cambiar tu contraseña
          </div>
          <input
            style={styles.input}
            type="password"
            placeholder="Nueva contraseña"
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            onKeyPress={e => e.key === 'Enter' && handleNewPassword()}
          />
          <button style={styles.button} onClick={handleNewPassword} disabled={loading}>
            {loading ? 'Cambiando...' : 'Cambiar contraseña'}
          </button>
          {error && <div style={styles.errorText}>{error}</div>}
        </div>
      </div>
    );
  }

  return (
    <div style={styles.loginContainer}>
      <div style={styles.loginCard}>
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
  	  <div style={{ fontSize: '28px', fontWeight: 'bold', color: COLORS.green, lineHeight: '1' }}>YUMA IoT</div>
  	  <div style={{ fontSize: '12px', color: COLORS.white, letterSpacing: '1px' }}>INTELLIGENT SYSTEMS FLOW</div>
	</div>
        <input
          style={styles.input}
          type="email"
          placeholder="Correo electrónico"
          value={email}
          onChange={e => setEmail(e.target.value)}
          onKeyPress={e => e.key === 'Enter' && handleLogin()}
        />
        <input
          style={styles.input}
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={e => setPassword(e.target.value)}
          onKeyPress={e => e.key === 'Enter' && handleLogin()}
        />
        <button style={styles.button} onClick={handleLogin} disabled={loading}>
          {loading ? 'Ingresando...' : 'Ingresar'}
        </button>
        {error && <div style={styles.errorText}>{error}</div>}
	<div style={{ textAlign: 'center', marginTop: '20px', fontSize: '11px', color: COLORS.white }}>
  © 2026 YUMA-TECH — All rights reserved
	</div>
      </div>
    </div>
  );
}

function DeviceScreen({ onLogout }) {
  const [relayOn, setRelayOn] = useState(false);
  const [connected, setConnected] = useState(false);
  const [time, setTime] = useState(new Date());
  const [location, setLocation] = useState({ lat: null, lon: null });
  const clientRef = useRef(null);
  const [dispositivos, setDispositivos] = useState([]);
  const [dispositivoActual, setDispositivoActual] = useState(null);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    cargarDispositivos();
  }, []);

  useEffect(() => {
    if (!dispositivoActual) return;
    connectIoT();
    return () => {
      if (clientRef.current?.subscription) clientRef.current.subscription.unsubscribe();
      if (clientRef.current?.subConexion) clientRef.current.subConexion.unsubscribe();
      if (clientRef.current?.subShadow) clientRef.current.subShadow.unsubscribe();
      if (clientRef.current?.subShadowUpdate) clientRef.current.subShadowUpdate.unsubscribe();
    };
  }, [dispositivoActual]);

  const cargarDispositivos = async () => {
    try {
      console.log('Cargando dispositivos...');
      const session = await fetchAuthSession({ forceRefresh: true });
      console.log('Credenciales:', session.credentials);
      const creds = session.credentials;
      
      if (!creds) {
        console.error('No hay credenciales');
        return;
      }

      const dynamoClient = new DynamoDBClient({
        region: 'us-east-1',
        credentials: creds,
      });
      const docClient = DynamoDBDocumentClient.from(dynamoClient);

      const { username } = await getCurrentUser();
      const session2 = await fetchAuthSession();
      const email = session2.tokens?.idToken?.payload?.email;
      console.log('Email:', email);
      
      
      const userResult = await docClient.send(new GetCommand({
        TableName: 'yuma-usuarios',
        Key: { email: email },
      }));

      console.log('Usuario:', userResult.Item);

      if (userResult.Item) {
        const deviceIds = userResult.Item.dispositivos;
        const devs = [];
        for (const deviceId of deviceIds) {
          const devResult = await docClient.send(new GetCommand({
            TableName: 'yuma-dispositivos',
            Key: { deviceId },
          }));
          if (devResult.Item) devs.push(devResult.Item);
        }
        setDispositivos(devs);
        if (devs.length > 0) setDispositivoActual(devs[0]);
        console.log('Dispositivos cargados:', devs);
      }
    } catch (err) {
      console.error('Error cargando dispositivos:', err);
    }
  };

  const connectIoT = async () => {
    try {
      const pubsub = new PubSub({
        region: IoTConfig.region,
        endpoint: `wss://${IoTConfig.endpoint}/mqtt`,
      });

      // Suscribirse al Shadow get/accepted para obtener estado inicial
      const subShadow = pubsub.subscribe({ 
        topics: `$aws/things/${dispositivoActual.thingName}/shadow/get/accepted` 
      }).subscribe({
        next: (data) => {
          console.log('Shadow recibido:', data);
          const state = data.state?.reported;
          if (state) {
            if (state.rele !== undefined) setRelayOn(state.rele === 1);
            if (state.lat && state.lon) setLocation({ 
              lat: parseFloat(state.lat), 
              lon: parseFloat(state.lon) 
            });
            if (state.connected !== undefined) setConnected(state.connected);
          }
        },
        error: (err) => console.error('Shadow error:', err),
      });

      const subShadowUpdate = pubsub.subscribe({ 
    	  topics: `$aws/things/${dispositivoActual.thingName}/shadow/update/accepted` 
}).subscribe({
    	  next: (data) => {
              console.log('Shadow UPDATE recibido:', JSON.stringify(data));
              const state = data.state?.reported;
              if (state) {
            	  if (state.connected !== undefined) setConnected(state.connected);
            	  if (state.rele !== undefined) setRelayOn(state.rele === 1);
              }
    	  },
    	  error: (err) => console.error('Shadow update error:', err),
      });

      const subscription = pubsub.subscribe({ topics: dispositivoActual.topicStatus }).subscribe({
        next: (data) => {
          console.log('Mensaje recibido:', data);
          if (data.rele !== undefined) setRelayOn(data.rele === 1);
          if (data.lat && data.lon) setLocation({ lat: parseFloat(data.lat), lon: parseFloat(data.lon) });
        },
        error: (err) => {
          console.error('PubSub error:', err);
          setConnected(false);
        },
      });

      const subConexion = pubsub.subscribe({ topics: dispositivoActual.topicConexion }).subscribe({
  	next: async (data) => {
    	  console.log('Estado conexion:', data);
    	  const isConnected = data.c === 1;
    	  setConnected(isConnected);
    
    	  // Actualizar Shadow desde la PWA
    	  try {
            await clientRef.current.pubsub.publish({
              topics: `$aws/things/${dispositivoActual.thingName}/shadow/update`,
              message: { state: { reported: { connected: isConnected } } },
      	    });
      	    console.log('Shadow actualizado:', isConnected);
    	  } catch (err) {
      	    console.error('Error actualizando Shadow:', err);
    	  }
  	},
  	error: (err) => console.error('Error conexion:', err),
      });

      clientRef.current = { subscription, subConexion, subShadow, subShadowUpdate, pubsub };
      setConnected(false);
      console.log('PubSub suscrito');

      // Solicitar estado actual del Shadow
      setTimeout(async () => {
        await clientRef.current.pubsub.publish({
          topics: `$aws/things/${dispositivoActual.thingName}/shadow/get`,
          message: {},
        });
        console.log('Shadow solicitado');
	console.log('Topic shadow update:', `$aws/things/${IoTConfig.thingName}/shadow/update/accepted`);
	console.log('ThingName:', IoTConfig.thingName);
      }, 2000);

    } catch (err) {
      console.error('IoT connection error:', err);
    }
  };

  const toggleRelay = async () => {
    const newState = !relayOn;
    setRelayOn(newState);
    try {
      if (clientRef.current?.pubsub) {
        await clientRef.current.pubsub.publish({
          topics: dispositivoActual.topicControl,
          message: { rele: newState ? 1 : 0 },
        });
        console.log('Comando enviado:', newState ? 'ON' : 'OFF');
      }
    } catch (err) {
      console.error('Error enviando comando:', err);
      setRelayOn(!newState);
    }
  };

  const formatTime = (date) => date.toLocaleTimeString('es-CO', {
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    timeZone: 'America/Bogota'
  });

  const formatDate = (date) => date.toLocaleDateString('es-CO', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    timeZone: 'America/Bogota'
  });

  return (
    <div style={styles.app}>
      <div style={styles.header}>
        <div>
          <div style={styles.logo}>YUMA IoT</div>
          <div style={styles.subtitle}>Intelligent Systems Flow</div>
        </div>
        <button onClick={onLogout} style={{
          background: 'none',
          border: `2px solid ${COLORS.green}`,
          color: COLORS.green,
          padding: '6px 12px',
          borderRadius: '8px',
          cursor: 'pointer',
          fontSize: '16px',
        }}>
          Salir
        </button>
      </div>

      <div style={styles.deviceCard}>
        <div style={styles.deviceName}>{dispositivoActual?.nombre || 'Cargando...'}</div>

        <div style={styles.infoRow}>
          <span style={styles.label}>Estado</span>
          <span>
            <span style={styles.statusDot(connected)}></span>
            <span style={styles.value}>{connected ? 'Conectado' : 'Desconectado'}</span>
          </span>
        </div>

        <div style={styles.infoRow}>
          <span style={styles.label}>Hora local</span>
          <span style={styles.value}>{formatTime(time)}</span>
        </div>

        <div style={styles.infoRow}>
          <span style={styles.label}>Fecha</span>
          <span style={styles.value}>{formatDate(time)}</span>
        </div>

        <div style={styles.infoRow}>
  	  <span style={styles.label}>Ubicación</span>
  	  <span style={styles.value}>
    	    {location.lat ? `${location.lat}, ${location.lon}` : 'Cargando...'}
  	  </span>
	</div>

	{location.lat && (
  	  <div style={{ height: '200px', borderRadius: '10px', overflow: 'hidden', marginTop: '16px' }}>
    	    <MapContainer
      	      center={[location.lat, location.lon]}
      	      zoom={15}
      	      style={{ height: '100%', width: '100%' }}
    	    >
      	      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      	      <Marker position={[location.lat, location.lon]}>
        	<Popup>Dispositivo aquí</Popup>
      	      </Marker>
    	    </MapContainer>
  	  </div>
	)}

        <button style={styles.relayButton(relayOn)} onClick={toggleRelay}>
          {relayOn ? '🟢 Alarma ACTIVA' : '🔴 Alarma INACTIVA'}
        </button>
      </div>
    </div>
  );
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => { checkAuth(); }, []);

  const checkAuth = async () => {
    try {
      await getCurrentUser();
      setIsAuthenticated(true);
    } catch {
      setIsAuthenticated(false);
    }
    setLoading(false);
  };

  const handleLogout = async () => {
    await signOut();
    setIsAuthenticated(false);
  };

  if (loading) return (
    <div style={{ ...styles.app, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: COLORS.green, fontSize: '18px' }}>Cargando...</div>
    </div>
  );

  return (
    <div style={styles.app}>
      {isAuthenticated
        ? <DeviceScreen onLogout={handleLogout} />
        : <LoginScreen onLogin={() => setIsAuthenticated(true)} />
      }
    </div>
  );
}

export default App;
