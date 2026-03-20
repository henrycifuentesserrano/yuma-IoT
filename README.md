# YUMA IoT — PWA IoT

Aplicación web progresiva (PWA) para control y monitoreo de dispositivos IoT desarrollada con React y AWS.

Parte del ecosistema **YUMA — Intelligent Systems Flow**.

---

## Descripción

YUMA Connect permite a los usuarios controlar y monitorear dispositivos IoT desde cualquier celular sin necesidad de instalar una app desde el Play Store. Se instala directamente desde el navegador como PWA.

Desarrollada para trabajar con dispositivos ESP32 conectados a AWS IoT Core via MQTT sobre TLS.

---

## Demo

🌐 [https://dh44ovtjgn9mg.cloudfront.net](https://dh44ovtjgn9mg.cloudfront.net)

---

## Funcionalidades

- Login seguro con AWS Cognito
- Cambio de contraseña en primer acceso
- Control de relé en tiempo real
- Estado de conexión del dispositivo (online/offline)
- Hora local en tiempo real
- Mapa interactivo con ubicación del dispositivo (Leaflet + OpenStreetMap)
- Comunicación MQTT via WebSocket con AWS IoT Core
- Diseño responsive optimizado para celular

---

## Stack tecnológico

- React 18
- AWS Amplify v6 (autenticación con Cognito)
- @aws-amplify/pubsub (MQTT WebSocket)
- React Leaflet + Leaflet (mapas)
- AWS IoT Core (broker MQTT)
- AWS Cognito (usuarios y autenticación)

---

## Requisitos previos

- Node.js v18 o superior
- Cuenta AWS con IoT Core y Cognito configurados
- Dispositivo ESP32 con firmware compatible

---

## Instalación
```bash
git clone https://github.com/henrycifuentesserrano/yuma-IoT.git
cd yuma-connect
npm install
```

Copia el archivo de ejemplo de variables de entorno:
```bash
cp .env.example .env
```

Edita `.env` con tus credenciales de AWS:
```
REACT_APP_AWS_REGION=us-east-1
REACT_APP_USER_POOL_ID=your_user_pool_id
REACT_APP_USER_POOL_CLIENT_ID=your_client_id
REACT_APP_IDENTITY_POOL_ID=your_identity_pool_id
REACT_APP_IOT_ENDPOINT=your_iot_endpoint
REACT_APP_TOPIC_CONTROL=your/topic/control
REACT_APP_TOPIC_STATUS=your/topic/status
REACT_APP_TOPIC_CONEXION=your/topic/conexion
```

Inicia el servidor de desarrollo:
```bash
npm start
```

---

## Arquitectura
```
Celular (PWA) → AWS Cognito (auth) → AWS IoT Core (MQTT) → ESP32-C2 → Relé
```

---

## Dispositivo compatible

Este proyecto fue desarrollado y probado con el **ESPC2-12 DevKit CozyLife**.

El firmware del dispositivo está disponible en:
[alarma-iot-esp32c2](https://github.com/henrycifuentesserrano/alarma-iot-esp32c2)

---

## Autor

Henry Cifuentes Serrano
[github.com/henrycifuentesserrano](https://github.com/henrycifuentesserrano)
