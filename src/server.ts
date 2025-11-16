import "./bootstrap/env";                 // ← must be first, loads .env before anything else

import { createApp } from "./app";
import { createHttpsServer } from "./middleware/https";

const PORT = Number(process.env.PORT || 8443);
const USE_HTTPS = process.env.USE_HTTPS === "true";

const app = createApp();

if (USE_HTTPS) {
    createHttpsServer(app).listen(PORT, () =>
        console.log(`Auth service (HTTPS) on https://localhost:${PORT}`)
);
} else {
    app.listen(PORT, () => console.log(`Auth service (HTTP) on http://localhost:${PORT}`));
}
