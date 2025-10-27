export default function (express, bodyParser, createReadStream, crypto, http) {
  const app = express();
  const TEXT = { "Content-Type": "text/plain; charset=utf-8" };
  const LOGIN = "vulkan21";

  app.use(bodyParser.urlencoded({ extended: false }));
  app.use(bodyParser.json());

  app.use((req, res, next) => {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,OPTIONS,DELETE");
    res.set("Access-Control-Allow-Headers", "*");
    if (req.method === "OPTIONS") return res.status(204).end();
    next();
  });

  app.use((req, res, next) => {
    if (!req.path.endsWith("/")) {
      const q = req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : "";
      return res.redirect(308, req.path + "/" + q);
    }
    next();
  });

  app.get("/login/", (_req, res) => {
    res.set(TEXT).send(LOGIN);
  });

  app.get("/code/", async (_req, res) => {
    try {
      const filePath = import.meta.url.startsWith("file://")
        ? import.meta.url.slice(7)
        : import.meta.url;
      const chunks = [];
      const stream = createReadStream(filePath);
      await new Promise((resolve, reject) => {
        stream.on("data", (c) => chunks.push(c));
        stream.on("end", resolve);
        stream.on("error", reject);
      });
      res.set(TEXT).send(Buffer.concat(chunks).toString("utf8"));
    } catch (e) {
      res.status(500).set(TEXT).send(String(e));
    }
  });

  app.get("/sha1/:input/", (req, res) => {
    const hash = crypto.createHash("sha1").update(req.params.input).digest("hex");
    res.set(TEXT).send(hash);
  });

  async function fetchHttp(addr) {
    return new Promise((resolve, reject) => {
      http
        .get(addr, (r) => {
          const chunks = [];
          r.on("data", (c) => chunks.push(c));
          r.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
          r.on("error", reject);
        })
        .on("error", reject);
    });
  }

  app.get("/req/", async (req, res) => {
    try {
      const addr = req.query.addr;
      if (!addr) return res.status(400).set(TEXT).send("Missing addr");
      const data = await fetchHttp(addr);
      res.set(TEXT).send(data);
    } catch (e) {
      res.status(500).set(TEXT).send(String(e));
    }
  });

  app.post("/req/", async (req, res) => {
    try {
      const addr = req.body.addr;
      if (!addr) return res.status(400).set(TEXT).send("Missing addr");
      const data = await fetchHttp(addr);
      res.set(TEXT).send(data);
    } catch (e) {
      res.status(500).set(TEXT).send(String(e));
    }
  });

  app.all(/.*/, (_req, res) => {
    res.set(TEXT).send(LOGIN);
  });

  return app;
}
