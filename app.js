const fs = require("fs");
const crypto = require("crypto");
const http = require("http");
const https = require("https");

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,HEAD,OPTIONS,POST,PUT",
  "Access-Control-Allow-Headers": "*",
};

const TEXT_PLAIN_HEADER = {
  "Content-Type": "text/plain; charset=utf-8",
};

const SYSTEM_LOGIN = "c5803a15-0cfc-4719-ab77-c604044c9c5a";

/** Middleware для CORS */
function corsMiddleware(req, res, next) {
  Object.entries(CORS_HEADERS).forEach(([k, v]) => res.setHeader(k, v));
  if (req.method === "OPTIONS") return res.status(204).end();
  next();
}

/** Чтение файла через поток */
function readFileAsync(filePath, createReadStream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    const stream = createReadStream(filePath);
    stream.on("data", (chunk) => chunks.push(chunk));
    stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    stream.on("error", (err) => reject(err));
  });
}

/** Генерация SHA1 хеша */
function generateSha1Hash(text) {
  return crypto.createHash("sha1").update(text).digest("hex");
}

/** Чтение данных из HTTP/HTTPS ответа */
function readHttpResponse(response) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    response.on("data", (chunk) => chunks.push(chunk));
    response.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    response.on("error", (err) => reject(err));
  });
}

/** Универсальная функция для GET-запроса по URL (поддержка http + https) */
async function fetchUrlData(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith("https") ? https : http;
    client
      .get(url, async (response) => {
        try {
          const data = await readHttpResponse(response);
          resolve(data);
        } catch (err) {
          reject(err);
        }
      })
      .on("error", reject);
  });
}

/** Создание Express-приложения */
function createApp(express, bodyParser, createReadStream, currentFilePath) {
  const app = express();

  app.use(bodyParser.urlencoded({ extended: false }));
  app.use(bodyParser.json());
  app.use(corsMiddleware);

  // Возвращает системный логин
  app.get("/login", (_req, res) => {
    res.set(TEXT_PLAIN_HEADER).send(SYSTEM_LOGIN);
  });

  // Возвращает содержимое текущего файла
  app.get("/code", async (_req, res) => {
    try {
      const fileContent = await readFileAsync(currentFilePath, createReadStream);
      res.set(TEXT_PLAIN_HEADER).send(fileContent);
    } catch (err) {
      res.status(500).set(TEXT_PLAIN_HEADER).send(err.toString());
    }
  });

  // Возвращает SHA1 хеш переданного параметра
  app.get("/sha1/:input", (req, res) => {
    const hash = generateSha1Hash(req.params.input);
    res.set(TEXT_PLAIN_HEADER).send(hash);
  });

  // GET /req/?addr=<url>
  app.get("/req", async (req, res) => {
    try {
      const data = await fetchUrlData(req.query.addr);
      res.set(TEXT_PLAIN_HEADER).send(data);
    } catch (err) {
      res.status(500).set(TEXT_PLAIN_HEADER).send(err.toString());
    }
  });

  // POST /req/ с JSON { addr: <url> }
  app.post("/req", async (req, res) => {
    try {
      const data = await fetchUrlData(req.body.addr);
      res.set(TEXT_PLAIN_HEADER).send(data);
    } catch (err) {
      res.status(500).set(TEXT_PLAIN_HEADER).send(err.toString());
    }
  });

  // Любой другой маршрут возвращает системный логин
  app.all(/.*/, (_req, res) => {
    res.set(TEXT_PLAIN_HEADER).send(SYSTEM_LOGIN);
  });

  return app;
}

module.exports = { createApp, SYSTEM_LOGIN };
