const awsConfig = {
  Auth: {
    Cognito: {
      userPoolId: process.env.REACT_APP_USER_POOL_ID,
      userPoolClientId: process.env.REACT_APP_USER_POOL_CLIENT_ID,
      identityPoolId: process.env.REACT_APP_IDENTITY_POOL_ID,
    }
  },
  PubSub: {
    aws_pubsub_region: process.env.REACT_APP_AWS_REGION,
    aws_pubsub_endpoint: `wss://${process.env.REACT_APP_IOT_ENDPOINT}/mqtt`,
  }
};

export const IoTConfig = {
  endpoint: process.env.REACT_APP_IOT_ENDPOINT,
  region: process.env.REACT_APP_AWS_REGION,
  topicControl: process.env.REACT_APP_TOPIC_CONTROL,
  topicStatus: process.env.REACT_APP_TOPIC_STATUS,
  topicConexion: process.env.REACT_APP_TOPIC_CONEXION,
  thingName: process.env.REACT_APP_THING_NAME,
};

export default awsConfig;