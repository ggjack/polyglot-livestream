import Fastify from "fastify";

const server = Fastify({ logger: true });

server.get("/health", async () => ({ status: "ok" }));

server.get("/config", async () => ({
  elevenLabs: Boolean(process.env.ELEVENLABS_API_KEY),
  vertexProject: process.env.GCP_PROJECT_ID || null
}));

server.listen({ port: 3001, host: "0.0.0.0" }).catch((err) => {
  server.log.error(err);
  process.exit(1);
});
