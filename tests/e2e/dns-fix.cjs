// Solo desarrollo y pruebas: el DNS del sistema que ve Node (127.0.0.1) no responde consultas SRV,
// y Mongo Atlas (mongodb+srv://) las necesita. Se carga con NODE_OPTIONS=--require; nunca en producción.
require("node:dns").setServers(["8.8.8.8", "1.1.1.1"]);
