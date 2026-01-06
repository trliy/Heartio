import express from "express";
import {
  searchStations,
  getTopStations,
  getStation
} from "./iheart.js";

const app = express();

const manifest = {
  id: "community.heartio",
  version: "1.0.0",
  name: "Heartio",
  description: "A radio streaming service for Stremio.",
  icon: "https://play-lh.googleusercontent.com/mLw46QbBnQtDoEGjKjBOo0qwSCH9YKo-owj0s_boiskp3bFxfGhB62bMpTBXfJ6mgMw=s188",
  types: ["radio"],
  catalogs: [
    {
      type: "radio",
      id: "heartio-top",
      name: "Top Stations",
      extra: [
        {
          name: "search",
          isRequired: false
        }
      ]
    }
  ],
  resources: ["catalog", "meta", "stream"],
  idPrefixes: ["heartio"]
};

app.get("/manifest.json", (req, res) => {
  res.json(manifest);
});

app.get("/catalog/:type/:id/:extra.json", async (req, res) => {
  const { search } = req.query;
  const extra = req.params.extra;

  let stations;
  if (search) {
    stations = await searchStations(search, 10000);
  } else if (extra && extra.startsWith("search=")) {
    const query = decodeURIComponent(extra.split("=")[1]);
    stations = await searchStations(query, 10000);
  } else {
    stations = await getTopStations(10000);
  }

  res.json({
    metas: (stations || []).map(s => ({
      id: `heartio:${s.id}`,
      type: "radio",
      name: s.name,
      poster: s.logo
    }))
  });
});

app.get("/catalog/:type/:id.json", async (req, res) => {
  const { search } = req.query;

  const stations = search
    ? await searchStations(search, 10000)
    : await getTopStations(10000);

  res.json({
    metas: (stations || []).map(s => ({
      id: `heartio:${s.id}`,
      type: "radio",
      name: s.name,
      poster: s.logo
    }))
  });
});

app.get("/meta/:type/:id.json", async (req, res) => {
  const id = req.params.id.replace("heartio:", "");
  const station = await getStation(id);

  res.json({
    meta: {
      id: `heartio:${station.id}`,
      type: "radio",
      name: station.name,
      poster: station.logo
    }
  });
});

app.get("/stream/:type/:id.json", async (req, res) => {
  const id = req.params.id.replace("heartio:", "");
  const station = await getStation(id);

  const behaviorHints = {
    notHashable: true,
    isLive: true
  };

  const streams = (station.streams && station.streams.length > 0) 
    ? station.streams.map(s => {
        const isExternal = s.title && s.title.includes("External Player");
        return {
          title: s.title,
          url: s.url,
          externalUrl: isExternal ? s.url : undefined,
          behaviorHints: isExternal ? { notHashable: true } : behaviorHints
        };
      })
    : [{
        title: "Live Stream",
        url: station.streamUrl,
        behaviorHints
      }];

  res.json({ streams });
});

app.get("/", (req, res) => {
  const host = `${req.protocol}://${req.get('host')}`;
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Heartio - iHeartRadio for Stremio</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap" rel="stylesheet">
        <style>
            :root {
                --iheart-red: #c6002b;
                --iheart-dark: #1a1a1a;
                --iheart-white: #ffffff;
            }
            body {
                font-family: 'Inter', sans-serif;
                background-color: var(--iheart-dark);
                color: var(--iheart-white);
                margin: 0;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                min-height: 100vh;
                text-align: center;
            }
            .container {
                max-width: 600px;
                padding: 40px;
                background: rgba(255, 255, 255, 0.05);
                border-radius: 24px;
                backdrop-filter: blur(10px);
                border: 1px solid rgba(255, 255, 255, 0.1);
                box-shadow: 0 20px 40px rgba(0,0,0,0.4);
            }
            .logo {
                font-size: 3.5rem;
                font-weight: 900;
                color: var(--iheart-red);
                margin-bottom: 10px;
                letter-spacing: -2px;
                text-transform: uppercase;
            }
            h1 {
                font-size: 1.5rem;
                font-weight: 700;
                margin-bottom: 30px;
                opacity: 0.9;
            }
            .install-box {
                background: #000;
                padding: 20px;
                border-radius: 12px;
                margin: 30px 0;
                border: 1px solid var(--iheart-red);
            }
            code {
                display: block;
                word-break: break-all;
                color: var(--iheart-red);
                font-weight: 700;
                font-size: 1.1rem;
                margin-top: 10px;
            }
            .btn {
                display: inline-block;
                background-color: var(--iheart-red);
                color: white;
                text-decoration: none;
                padding: 14px 28px;
                border-radius: 50px;
                font-weight: 700;
                margin: 10px;
                transition: transform 0.2s, background-color 0.2s;
            }
            .btn:hover {
                transform: scale(1.05);
                background-color: #e60032;
            }
            .btn-outline {
                background: transparent;
                border: 2px solid var(--iheart-white);
            }
            .btn-outline:hover {
                background: var(--iheart-white);
                color: var(--iheart-dark);
            }
            p {
                line-height: 1.6;
                opacity: 0.7;
            }
            .footer {
                margin-top: 40px;
                font-size: 0.8rem;
                opacity: 0.5;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="logo">Heartio</div>
            <h1>iHeartRadio Addon for Stremio</h1>
            <p>Stream your favorite live radio stations directly in Stremio.</p>
            
            <div class="install-box">
                <p style="margin-top:0; opacity: 1;">Copy this URL to install in Stremio:</p>
                <code>${host}/manifest.json</code>
            </div>

            <div>
                <a href="stremio://${host.replace(/^https?:\/\//, '')}/manifest.json" class="btn">Install in Stremio</a>
                <a href="/manifest.json" class="btn btn-outline">View Manifest</a>
            </div>
            
            <p style="margin-top: 30px;">
                Looking for something specific? 
                <a href="/catalog/radio/heartio-top.json" style="color: var(--iheart-red); text-decoration: none; font-weight: 700;">Explore Catalog</a>
            </p>
        </div>
        <div class="footer">
            Powered by iHeartRadio API • Built for Stremio
        </div>
    </body>
    </html>
  `);
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Heartio running on port ${PORT}`);
});
