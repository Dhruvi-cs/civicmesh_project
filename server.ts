import express from "express";
import path from "path";
import multer from "multer";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";

const app = express();
const PORT = 3000;

// Setup JSON parsing and urlencoded parsing with standard limits
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Configure Multer for in-memory uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  }
});

// Initialize Gemini Client with proper User-Agent header for AI Studio
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// Interfaces
interface TicketUpdate {
  description: string;
  imageUrl?: string;
  createdAt: string;
}

interface Ticket {
  id: string;
  category: string; // Pothole, Water Leakage, Broken Streetlight, Waste Management
  description: string;
  latitude: number;
  longitude: number;
  imageUrl?: string;
  validation_count: number;
  status: 'Open' | 'Resolved';
  createdAt: string;
  updates: TicketUpdate[];
}

// In-Memory active state repository of civic tickets (Lucknow-focused initial seeds)
let tickets: Ticket[] = [
  {
    id: "TKT-1001",
    category: "Pothole",
    description: "Deep, dangerous pothole near the Hazratganj crossing causing vehicle speedups and hazards.",
    latitude: 26.8480,
    longitude: 80.9440,
    validation_count: 3,
    status: "Open",
    createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    updates: []
  },
  {
    id: "TKT-1002",
    category: "Broken Streetlight",
    description: "Three consecutive streetlights are broken. Extreme dark stretch near Gomti Nagar Park.",
    latitude: 26.8520,
    longitude: 80.9650,
    validation_count: 1,
    status: "Open",
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    updates: []
  },
  {
    id: "TKT-1003",
    category: "Water Leakage",
    description: "Major water supply pipe leakage under the main road in Aliganj. Pavement is cracking.",
    latitude: 26.8850,
    longitude: 80.9380,
    validation_count: 5,
    status: "Open",
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    updates: []
  },
  {
    id: "TKT-1004",
    category: "Waste Management",
    description: "Garbage overflow blocking pedestrian pathways near Aminabad Market.",
    latitude: 26.8400,
    longitude: 80.9250,
    validation_count: 2,
    status: "Open",
    createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    updates: []
  }
];

// Haversine Distance Formula in Meters
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Earth's radius in meters
  const phi1 = lat1 * Math.PI / 180;
  const phi2 = lat2 * Math.PI / 180;
  const deltaPhi = (lat2 - lat1) * Math.PI / 180;
  const deltaLambda = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
            Math.cos(phi1) * Math.cos(phi2) *
            Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // distance in meters
}

// REST API routes registered before Vite middleware

// 1. Get all tickets
app.get("/api/tickets", (req, res) => {
  res.json(tickets);
});

// 2. Submit a new ticket, running through the 3-Step Verification Mesh
app.post("/api/tickets", upload.single("image"), async (req, res) => {
  try {
    const { category, description, latitude, longitude } = req.body;
    
    if (!category || !description || !latitude || !longitude) {
      return res.status(400).json({ error: "Required fields missing: category, description, latitude, and longitude must be provided." });
    }

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    if (isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({ error: "Invalid coordinate values provided." });
    }

    // STEP 1: Geospatial Filter
    // Find active 'Open' records sitting within a 50-meter radius
    const nearbyTickets = tickets.filter(t => t.status === "Open" && haversineDistance(lat, lng, t.latitude, t.longitude) <= 50);

    let isDuplicate = false;
    let confidence = 0.0;
    let reasoning = "No nearby active issue flagged within 50 meters.";
    let mergedTicket: Ticket | null = null;
    let usedMultimodal = false;

    if (nearbyTickets.length > 0) {
      // Pick the closest active record for duplicate checking
      let closestTicket = nearbyTickets[0];
      let minDistance = haversineDistance(lat, lng, closestTicket.latitude, closestTicket.longitude);
      for (let i = 1; i < nearbyTickets.length; i++) {
        const d = haversineDistance(lat, lng, nearbyTickets[i].latitude, nearbyTickets[i].longitude);
        if (d < minDistance) {
          minDistance = d;
          closestTicket = nearbyTickets[i];
        }
      }

      // STEP 2: Multimodal / Text Analysis
      const ticketHasImage = !!closestTicket.imageUrl;
      const uploadHasImage = !!req.file;

      if (ticketHasImage && uploadHasImage) {
        usedMultimodal = true;
        const uploadBuffer = req.file!.buffer;
        const uploadMime = req.file!.mimetype;

        // Parse base64 from the existing ticket's imageUrl
        let base64Data1 = "";
        let mimeType1 = "image/jpeg";
        if (closestTicket.imageUrl!.startsWith("data:")) {
          const match = closestTicket.imageUrl!.match(/^data:([^;]+);base64,(.+)$/);
          if (match) {
            mimeType1 = match[1];
            base64Data1 = match[2];
          }
        }

        const parts: any[] = [
          {
            inlineData: {
              mimeType: mimeType1,
              data: base64Data1
            }
          },
          {
            inlineData: {
              mimeType: uploadMime,
              data: uploadBuffer.toString("base64")
            }
          },
          {
            text: `Analyze these infrastructure anomaly photos. Determine if they show the exact same physical structural failure or civic issue at coordinates (${closestTicket.latitude}, ${closestTicket.longitude}).
Existing Issue Category: ${closestTicket.category}
Existing Issue Description: ${closestTicket.description}

New Report Category: ${category}
New Report Description: ${description}

Return your verdict strictly in this JSON format:
{
  "is_duplicate": boolean,
  "confidence": float,
  "reasoning": string
}`
          }
        ];

        const response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: { parts },
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                is_duplicate: { type: Type.BOOLEAN },
                confidence: { type: Type.NUMBER },
                reasoning: { type: Type.STRING }
              },
              required: ["is_duplicate", "confidence", "reasoning"]
            }
          }
        });

        if (response.text) {
          try {
            const result = JSON.parse(response.text.trim());
            isDuplicate = !!result.is_duplicate;
            confidence = parseFloat(result.confidence);
            reasoning = result.reasoning || "";
          } catch (e) {
            console.error("Failed to parse Gemini multimodal JSON response:", e);
            reasoning = "Error parsing Gemini multimodal comparison. Standard safe comparison triggered.";
          }
        }
      } else {
        // Fallback to text-based duplicate verification via Gemini if images aren't both present
        const response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: `Analyze these two infrastructure issue reports situated within a hyperlocal 50m radius. Determine if they describe the exact same physical structural failure or civic anomaly.
Existing Issue [Category: ${closestTicket.category}]: "${closestTicket.description}"
New Report [Category: ${category}]: "${description}"

Return your verdict strictly in this JSON format:
{
  "is_duplicate": boolean,
  "confidence": float,
  "reasoning": string
}`,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                is_duplicate: { type: Type.BOOLEAN },
                confidence: { type: Type.NUMBER },
                reasoning: { type: Type.STRING }
              },
              required: ["is_duplicate", "confidence", "reasoning"]
            }
          }
        });

        if (response.text) {
          try {
            const result = JSON.parse(response.text.trim());
            isDuplicate = !!result.is_duplicate;
            confidence = parseFloat(result.confidence);
            reasoning = result.reasoning || "";
          } catch (e) {
            console.error("Failed to parse Gemini text JSON response:", e);
            reasoning = "Error parsing Gemini description similarity analysis.";
          }
        }
      }

      // STEP 3: Automated Merge Decision
      if (isDuplicate && confidence >= 0.75) {
        // Increment existing record's validation count and merge descriptions
        closestTicket.validation_count += 1;
        
        const updateImgUrl = req.file ? `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}` : undefined;
        closestTicket.updates.unshift({
          description: `Merged verified duplicate report: "${description}"`,
          imageUrl: updateImgUrl,
          createdAt: new Date().toISOString()
        });

        mergedTicket = closestTicket;
      }
    }

    if (mergedTicket) {
      return res.status(200).json({
        event: "MERGED",
        message: "Duplicate civic issue flagged and merged into an existing ticket.",
        ticket: mergedTicket,
        verification: {
          flagged: true,
          distanceMeters: haversineDistance(lat, lng, mergedTicket.latitude, mergedTicket.longitude),
          isDuplicate,
          confidence,
          reasoning,
          usedMultimodal
        }
      });
    } else {
      // Create a completely new master ticket
      const newId = `TKT-${Math.floor(1000 + Math.random() * 9000)}`;
      let imageUrl: string | undefined = undefined;
      if (req.file) {
        imageUrl = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
      }

      const newTicket: Ticket = {
        id: newId,
        category,
        description,
        latitude: lat,
        longitude: lng,
        imageUrl,
        validation_count: 1,
        status: "Open",
        createdAt: new Date().toISOString(),
        updates: []
      };

      tickets.unshift(newTicket);

      return res.status(201).json({
        event: "CREATED",
        message: "New master ticket successfully verified and registered.",
        ticket: newTicket,
        verification: {
          flagged: nearbyTickets.length > 0,
          distanceMeters: nearbyTickets.length > 0 ? haversineDistance(lat, lng, nearbyTickets[0].latitude, nearbyTickets[0].longitude) : null,
          isDuplicate,
          confidence,
          reasoning,
          usedMultimodal
        }
      });
    }

  } catch (error: any) {
    console.error("Error submitting ticket to pipeline:", error);
    res.status(500).json({ error: error?.message || "An error occurred during submission processing." });
  }
});

// 3. Mark a ticket as resolved
app.post("/api/tickets/:id/resolve", (req, res) => {
  const { id } = req.params;
  const ticket = tickets.find(t => t.id === id);
  if (!ticket) {
    return res.status(404).json({ error: "Ticket not found" });
  }
  ticket.status = "Resolved";
  res.json({ message: "Ticket marked as resolved.", ticket });
});

// Vite + Static Serving Pipeline Setup
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Community Hero Server] Listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
