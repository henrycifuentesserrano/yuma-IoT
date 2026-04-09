import React, { useState, useEffect, useRef } from 'react';
import { signIn, signOut, getCurrentUser } from 'aws-amplify/auth';
import { IoTConfig } from './aws-config';
import { PubSub } from '@aws-amplify/pubsub';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, ScanCommand, PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
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

function DeviceScreen({ onLogout, isAdmin, onAdmin }) {
  const [relayOn, setRelayOn] = useState(false);
  const [connected, setConnected] = useState(false);
  const [time, setTime] = useState(new Date());
  const [location, setLocation] = useState({ lat: null, lon: null });
  const clientRef = useRef(null);
  const [dispositivos, setDispositivos] = useState([]);
  const [dispositivoActual, setDispositivoActual] = useState(null);
  const [cargandoDispositivos, setCargandoDispositivos] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    cargarDispositivos();
  }, []);

  useEffect(() => {
    if (!dispositivoActual) return;
    
    // Limpiar conexión anterior si existe
    if (clientRef.current?.subscription) clientRef.current.subscription.unsubscribe();
    if (clientRef.current?.subConexion) clientRef.current.subConexion.unsubscribe();
    if (clientRef.current?.subShadow) clientRef.current.subShadow.unsubscribe();
    if (clientRef.current?.subShadowUpdate) clientRef.current.subShadowUpdate.unsubscribe();
    clientRef.current = null;
    
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
      // Guardar Identity ID en DynamoDB y asociar política IoT
      const identityId = session.identityId;
      const email2 = session2.tokens?.idToken?.payload?.email;
      if (identityId && email2) {
        await docClient.send(new UpdateCommand({
          TableName: 'yuma-usuarios',
          Key: { email: email2 },
          UpdateExpression: 'SET identityId = :id',
          ExpressionAttributeValues: {
            ':id': identityId,
          },
        }));
        console.log('Identity ID guardado:', identityId);

        // Asociar política IoT automáticamente
        try {
          await fetch(`${process.env.REACT_APP_API_URL}/iot-policy`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identityId }),
          });
          console.log('Política IoT asociada automáticamente');
        } catch (err) {
          console.error('Error asociando política IoT:', err);
        }
      }

    } catch (err) {
      console.error('Error cargando dispositivos:', err);
    }
    setCargandoDispositivos(false);
  };

  const connectIoT = async () => {
    try {
      const sessionTemp = await fetchAuthSession({ forceRefresh: true });
      console.log('IdentityId:', sessionTemp.identityId);
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

if (cargandoDispositivos) {
    return (
      <div style={{ ...styles.app, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: COLORS.green, fontSize: '18px' }}>Cargando...</div>
      </div>
    );
  }

if (!dispositivoActual) {
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
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📱</div>
          <div style={{ color: COLORS.white, fontSize: '18px', fontWeight: 'bold', marginBottom: '8px' }}>
            No tienes dispositivos asignados
          </div>
          <div style={{ color: COLORS.darkGray, fontSize: '14px' }}>
            Contacta al administrador para que te asigne un dispositivo.
          </div>
        </div>
      </div>
    );
  }

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
    	  <div style={{ display: 'flex', gap: '8px' }}>
      	    {isAdmin && (
              <button onClick={onAdmin} style={{
                background: 'none',
                border: `2px solid ${COLORS.green}`,
                color: COLORS.green,
                padding: '6px 12px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '13px',
          	fontWeight: 'bold',
              }}>
          	Admin
              </button>
            )}
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

function AdminScreen({ onBack }) {
  const [usuarios, setUsuarios] = useState([]);
  const [dispositivos, setDispositivos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUser, setNewUser] = useState({ nombre: '', email: '', password: '', rol: 'cliente' });
  const [savingUser, setSavingUser] = useState(false);
  const [errorUser, setErrorUser] = useState('');
  const [showAddDevice, setShowAddDevice] = useState(false);
  const [newDevice, setNewDevice] = useState({ nombre: '', deviceId: '', propietario: '' });
  const [savingDevice, setSavingDevice] = useState(false);
  const [errorDevice, setErrorDevice] = useState('');
  const [showAssignDevice, setShowAssignDevice] = useState(null);
  const [selectedDevice, setSelectedDevice] = useState('');
  const [savingAssign, setSavingAssign] = useState(false);
  const [deletingUser, setDeletingUser] = useState(null);
  const [deletingDevice, setDeletingDevice] = useState(null);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      const session = await fetchAuthSession({ forceRefresh: true });
      const creds = session.credentials;

      const dynamoClient = new DynamoDBClient({
        region: 'us-east-1',
        credentials: creds,
      });
      const docClient = DynamoDBDocumentClient.from(dynamoClient);

      // Cargar todos los usuarios
      const usuariosResult = await docClient.send(new ScanCommand({
        TableName: 'yuma-usuarios',
      }));
      setUsuarios(usuariosResult.Items || []);

      // Cargar todos los dispositivos
      const dispositivosResult = await docClient.send(new ScanCommand({
        TableName: 'yuma-dispositivos',
      }));
      setDispositivos(dispositivosResult.Items || []);

    } catch (err) {
      console.error('Error cargando datos admin:', err);
    }
    setLoading(false);
  };

  const crearUsuario = async () => {
    setSavingUser(true);
    setErrorUser('');
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/usuarios`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser),
      });
      const data = await response.json();
      if (response.ok) {
        setShowAddUser(false);
        setNewUser({ nombre: '', email: '', password: '', rol: 'cliente' });
        cargarDatos();
        console.log('Usuario creado:', data);
      } else {
        setErrorUser(data.error || 'Error al crear usuario');
      }
    } catch (err) {
      console.error('Error:', err);
      setErrorUser('Error de conexión');
    }
    setSavingUser(false);
  };

  const crearDispositivo = async () => {
    setSavingDevice(true);
    setErrorDevice('');
    try {
      const session = await fetchAuthSession({ forceRefresh: true });
      const creds = session.credentials;
      const dynamoClient = new DynamoDBClient({
        region: 'us-east-1',
        credentials: creds,
      });
      const docClient = DynamoDBDocumentClient.from(dynamoClient);

      await docClient.send(new PutCommand({
        TableName: 'yuma-dispositivos',
        Item: {
          deviceId: newDevice.deviceId,
          nombre: newDevice.nombre,
          propietario: newDevice.propietario,
          topicControl: `${newDevice.deviceId}/rele/control`,
          topicStatus: `${newDevice.deviceId}/rele/status`,
          topicConexion: `${newDevice.deviceId}/rele/conexion`,
          thingName: newDevice.deviceId,
          activo: true,
        },
      }));

      // Si tiene propietario, asignarlo automáticamente al usuario
      if (newDevice.propietario) {
        const usuarioPropietario = usuarios.find(u => u.email === newDevice.propietario);
        if (usuarioPropietario) {
          const dispositivosActuales = usuarioPropietario.dispositivos || [];
          if (!dispositivosActuales.includes(newDevice.deviceId)) {
            await docClient.send(new UpdateCommand({
              TableName: 'yuma-usuarios',
              Key: { email: newDevice.propietario },
              UpdateExpression: 'SET dispositivos = :devs',
              ExpressionAttributeValues: {
                ':devs': [...dispositivosActuales, newDevice.deviceId],
              },
            }));
            console.log('Dispositivo asignado automáticamente a:', newDevice.propietario);
          }
        }
      }

      setShowAddDevice(false);
      setNewDevice({ nombre: '', deviceId: '', propietario: '' });
      cargarDatos();
      console.log('Dispositivo creado');
    } catch (err) {
      console.error('Error:', err);
      setErrorDevice('Error al crear dispositivo');
    }
    setSavingDevice(false);
  };

  const asignarDispositivo = async (emailUsuario) => {
    setSavingAssign(true);
    try {
      console.log('Asignando dispositivo:', selectedDevice, 'a usuario:', emailUsuario);
      const session = await fetchAuthSession({ forceRefresh: true });
      const creds = session.credentials;
      console.log('Credenciales:', creds ? 'OK' : 'NO');

      const dynamoClient = new DynamoDBClient({
        region: 'us-east-1',
        credentials: creds,
      });
      const docClient = DynamoDBDocumentClient.from(dynamoClient);

      const usuario = usuarios.find(u => u.email === emailUsuario);
      const dispositivosActuales = usuario.dispositivos || [];
      
      if (!dispositivosActuales.includes(selectedDevice)) {
        await docClient.send(new UpdateCommand({
          TableName: 'yuma-usuarios',
          Key: { email: emailUsuario },
          UpdateExpression: 'SET dispositivos = :devs',
          ExpressionAttributeValues: {
            ':devs': [...dispositivosActuales, selectedDevice],
          },
        }));
        setShowAssignDevice(null);
        setSelectedDevice('');
        cargarDatos();
        console.log('Dispositivo asignado');
      }
    } catch (err) {
      console.error('Error asignando dispositivo:', err);
    }
    setSavingAssign(false);
  };
  
  const eliminarUsuario = async (email) => {
    if (!window.confirm(`¿Eliminar usuario ${email}?`)) return;
    setDeletingUser(email);
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/usuarios?email=${encodeURIComponent(email)}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });
      if (response.ok) {
        cargarDatos();
        console.log('Usuario eliminado:', email);
      }
    } catch (err) {
      console.error('Error eliminando usuario:', err);
    }
    setDeletingUser(null);
  };

  const eliminarDispositivo = async (deviceId) => {
    if (!window.confirm(`¿Eliminar dispositivo ${deviceId}?`)) return;
    setDeletingDevice(deviceId);
    try {
      const session = await fetchAuthSession({ forceRefresh: true });
      const creds = session.credentials;
      const dynamoClient = new DynamoDBClient({ region: 'us-east-1', credentials: creds });
      const docClient = DynamoDBDocumentClient.from(dynamoClient);
      
      // Eliminar dispositivo de DynamoDB
      const { DeleteCommand } = await import('@aws-sdk/lib-dynamodb');
      await docClient.send(new DeleteCommand({
        TableName: 'yuma-dispositivos',
        Key: { deviceId },
      }));

      // Remover dispositivo de todos los usuarios que lo tienen
      for (const usuario of usuarios) {
        if (usuario.dispositivos?.includes(deviceId)) {
          await docClient.send(new UpdateCommand({
            TableName: 'yuma-usuarios',
            Key: { email: usuario.email },
            UpdateExpression: 'SET dispositivos = :devs',
            ExpressionAttributeValues: {
              ':devs': usuario.dispositivos.filter(d => d !== deviceId),
            },
          }));
          console.log('Dispositivo removido del usuario:', usuario.email);
        }
      }

      cargarDatos();
      console.log('Dispositivo eliminado:', deviceId);
    } catch (err) {
      console.error('Error eliminando dispositivo:', err);
    }
    setDeletingDevice(null);
  };

  return (
    <div style={styles.app}>
      <div style={styles.header}>
        <div>
          <div style={styles.logo}>YUMA IoT</div>
          <div style={styles.subtitle}>Panel Admin</div>
        </div>
        <button onClick={onBack} style={{
          background: 'none',
          border: `2px solid ${COLORS.green}`,
          color: COLORS.green,
          padding: '6px 12px',
          borderRadius: '8px',
          cursor: 'pointer',
          fontSize: '13px',
          fontWeight: 'bold',
        }}>
          Volver
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: COLORS.green }}>
          Cargando...
        </div>
      ) : (
        <div style={{ padding: '16px' }}>

          {/* Resumen */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
            <div style={{ ...styles.deviceCard, flex: 1, textAlign: 'center', padding: '16px' }}>
              <div style={{ fontSize: '32px', fontWeight: 'bold', color: COLORS.green }}>{usuarios.length}</div>
              <div style={{ color: COLORS.darkGray, fontSize: '14px' }}>Usuarios</div>
            </div>
            <div style={{ ...styles.deviceCard, flex: 1, textAlign: 'center', padding: '16px' }}>
              <div style={{ fontSize: '32px', fontWeight: 'bold', color: COLORS.green }}>{dispositivos.length}</div>
              <div style={{ color: COLORS.darkGray, fontSize: '14px' }}>Dispositivos</div>
            </div>
          </div>
	  
	  {/* Botón agregar usuario */}
	  <button 
  	    onClick={() => setShowAddUser(!showAddUser)}
            style={{
    	      width: '100%',
              padding: '12px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: COLORS.green,
              color: COLORS.white,
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: 'pointer',
              marginBottom: '16px',
            }}>
            {showAddUser ? 'Cancelar' : '+ Agregar Usuario'}
          </button>

          {/* Formulario agregar usuario */}
          {showAddUser && (
            <div style={{ ...styles.deviceCard, marginBottom: '16px' }}>
              <div style={{ ...styles.deviceName, marginBottom: '12px' }}>Nuevo Usuario</div>
              <input
                style={styles.input}
                placeholder="Nombre completo"
                value={newUser.nombre}
                onChange={e => setNewUser({ ...newUser, nombre: e.target.value })}
              />
              <input
                style={styles.input}
                placeholder="Correo electrónico"
                type="email"
                value={newUser.email}
                onChange={e => setNewUser({ ...newUser, email: e.target.value })}
              />
              <input
                style={styles.input}
                placeholder="Contraseña temporal"
                type="password"
                value={newUser.password}
                onChange={e => setNewUser({ ...newUser, password: e.target.value })}
              />
              <select
                style={{ ...styles.input, marginBottom: '12px' }}
                value={newUser.rol}
                onChange={e => setNewUser({ ...newUser, rol: e.target.value })}
              > 
                <option value="cliente">Cliente</option>
                <option value="admin">Admin</option>
              </select>
              {errorUser && <div style={styles.errorText}>{errorUser}</div>}
              <button
                style={{ ...styles.button, marginTop: '8px' }}
                onClick={crearUsuario}
                disabled={savingUser}
              >
                {savingUser ? 'Creando...' : 'Crear Usuario'}
              </button>
            </div>
          )}
          

          {/* Lista de usuarios */}
          <div style={styles.deviceCard}>
            <div style={{ ...styles.deviceName, marginBottom: '12px' }}>👥 Usuarios</div>
            {usuarios.map((u) => (
  	      <div key={u.email}>
                <div style={styles.infoRow}>
		  <div>
		    <div style={{ color: COLORS.white, fontWeight: 'bold', fontSize: '14px' }}>{u.nombre}</div>
        	    <div style={{ color: COLORS.darkGray, fontSize: '12px' }}>{u.email}</div>
 		  </div>
		  <div style={{ textAlign: 'right' }}>
		    <div style={{
		      color: u.rol === 'admin' ? COLORS.green : COLORS.white,
          	      fontSize: '12px',
          	      fontWeight: 'bold'
		    }}>{u.rol}</div>
		    <div style={{ color: COLORS.darkGray, fontSize: '12px' }}>
		      {u.dispositivos?.length || 0} dispositivo(s)
		    </div>
        	    <button
		      onClick={() => setShowAssignDevice(showAssignDevice === u.email ? null : u.email)}
                      style={{
			background: 'none',
                        border: `1px solid ${COLORS.green}`,
                        color: COLORS.green,
                        padding: '3px 8px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '11px',
                        marginTop: '4px',
		      }}>
		      + Asignar
		    </button>
		    <button
                      onClick={() => eliminarUsuario(u.email)}
                      disabled={deletingUser === u.email}
                      style={{
                        background: 'none',
                        border: `1px solid ${COLORS.red}`,
                        color: COLORS.red,
                        padding: '3px 8px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '11px',
                        marginTop: '4px',
                        marginLeft: '4px',
                       }}>
                       {deletingUser === u.email ? '...' : 'Eliminar'}
                    </button>
                  </div>
                </div>
                {showAssignDevice === u.email && (
                  <div style={{ padding: '8px 0', borderBottom: `1px solid ${COLORS.darkBlue}` }}>
                    <select
                      style={{ ...styles.input, marginBottom: '8px' }}
                      value={selectedDevice}
                      onChange={e => setSelectedDevice(e.target.value)}
                    >
		      <option value="">Seleccionar dispositivo</option>
                      {dispositivos.map(d => (
		        <option key={d.deviceId} value={d.deviceId}>{d.nombre}</option>
  		      ))}
		    </select>
		    <button
		      style={{ ...styles.button, padding: '8px' }}
                      onClick={() => asignarDispositivo(u.email)}
                      disabled={savingAssign || !selectedDevice}
	            >
		      {savingAssign ? 'Asignando...' : 'Confirmar'}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

	  {/* Botón agregar dispositivo */}
	  <button
	    onClick={() => setShowAddDevice(!showAddDevice)}
	    style={{
	      width: '100%',
	      padding: '12px',
    	      borderRadius: '8px',
    	      border: 'none',
    	      backgroundColor: COLORS.blue,
    	      color: COLORS.white,
    	      fontSize: '16px',
    	      fontWeight: 'bold',
    	      cursor: 'pointer',
    	      marginBottom: '16px',
    	      border: `2px solid ${COLORS.green}`,
            }}>
            {showAddDevice ? 'Cancelar' : '+ Agregar Dispositivo'}
          </button>

	  {/* Formulario agregar dispositivo */}
	  {showAddDevice && (
	    <div style={{ ...styles.deviceCard, marginBottom: '16px' }}>
	      <div style={{ ...styles.deviceName, marginBottom: '12px' }}>Nuevo Dispositivo</div>
              <input
	        style={styles.input}
      	        placeholder="Nombre del dispositivo"
                value={newDevice.nombre}
                onChange={e => setNewDevice({ ...newDevice, nombre: e.target.value })}
              />
	      <input
      	        style={styles.input}
      		placeholder="ID del dispositivo (ej: esp32-rele-finca2)"
      		value={newDevice.deviceId}
      		onChange={e => setNewDevice({ ...newDevice, deviceId: e.target.value })}
    	      />
	      <input
      		style={styles.input}
      		placeholder="Email del propietario"
      		value={newDevice.propietario}
      		onChange={e => setNewDevice({ ...newDevice, propietario: e.target.value })}
    	      />
	      {errorDevice && <div style={styles.errorText}>{errorDevice}</div>}
    	      <button
      		style={{ ...styles.button, marginTop: '8px' }}
      		onClick={crearDispositivo}
      		disabled={savingDevice}
    	      >
		{savingDevice ? 'Guardando...' : 'Crear Dispositivo'}
   	      </button>
	    </div>
	  )}

          {/* Lista de dispositivos */}
          <div style={{ ...styles.deviceCard, marginTop: '16px' }}>
            <div style={{ ...styles.deviceName, marginBottom: '12px' }}>📱 Dispositivos</div>
            {dispositivos.map((d) => (
              <div key={d.deviceId} style={styles.infoRow}>
                <div>
                  <div style={{ color: COLORS.white, fontWeight: 'bold', fontSize: '14px' }}>{d.nombre}</div>
                  <div style={{ color: COLORS.darkGray, fontSize: '12px' }}>{d.deviceId}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ color: COLORS.darkGray, fontSize: '12px' }}>{d.propietario}</div>
                  <button
                    onClick={() => eliminarDispositivo(d.deviceId)}
                    disabled={deletingDevice === d.deviceId}
                    style={{
                      background: 'none',
                      border: `1px solid ${COLORS.red}`,
                      color: COLORS.red,
                      padding: '3px 8px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '11px',
                      marginTop: '4px',
                    }}>
                    {deletingDevice === d.deviceId ? '...' : 'Eliminar'}
                  </button>
		</div>
              </div>
            ))}
          </div>

        </div>
      )}
    </div>
  );
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);

  useEffect(() => { checkAuth(); }, []);
  

  const checkAuth = async () => {
    try {
      await getCurrentUser();
      setIsAuthenticated(true);
      
      const session = await fetchAuthSession();
      console.log('Token payload:', session.tokens?.accessToken?.payload);
      const groups = session.tokens?.accessToken?.payload?.['cognito:groups'] || [];
      console.log('Grupos:', groups);
      setIsAdmin(groups.includes('admins'));
      
    } catch (err) {
      console.error('checkAuth error:', err);
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
        ? showAdmin
          ? <AdminScreen onBack={() => setShowAdmin(false)} />
          : <DeviceScreen 
              onLogout={handleLogout} 
              isAdmin={isAdmin}
              onAdmin={() => setShowAdmin(true)}
            />
        : <LoginScreen onLogin={() => setIsAuthenticated(true)} />
      }
    </div>
  );
}

export default App;
