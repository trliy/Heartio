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
  types: ["radio"],
  catalogs: [
    {
      type: "radio",
      id: "heartio-top",
      name: "Top Stations"
    }
  ],
  resources: ["catalog", "meta", "stream"],
  idPrefixes: ["heartio"]
};

app.get("/manifest.json", (req, res) => {
  res.json(manifest);
});

app.get("/catalog/:type/:id.json", async (req, res) => {
  const { search } = req.query;

  const stations = search
    ? await searchStations(search)
    : await getTopStations();

  res.json({
    metas: stations.map(s => ({
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

  res.json({
    streams: [
      {
        title: "Live Stream",
        url: station.streamUrl
      }
    ]
  });
});

const PORT = process.env.PORT || 7000;
app.listen(PORT, () => {
  console.log(`Heartio running on port ${PORT}`);
});
