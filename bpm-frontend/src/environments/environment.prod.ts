export const environment = {
  production: true,
  apiUrl: 'https://bpm-backend-core-238791343286.us-central1.run.app/api',
  aiServiceUrl: 'https://bpm-ai-microservice-238791343286.us-central1.run.app',
  // WebSocket connects DIRECTLY to the backend Cloud Run service.
  // Going through nginx double-proxy breaks WebSocket on Cloud Run.
  wsUrl: 'wss://bpm-backend-core-238791343286.us-central1.run.app/ws-bpm'
};
