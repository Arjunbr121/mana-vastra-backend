# Mana Vastra Backend

REST API for the Mana Vastra saree inventory and order management system.

## Live URL

```
https://mana-vastra-backend-production.up.railway.app
```

## Tech Stack

- Node.js + Express
- SQLite (via better-sqlite3)
- Cloudinary (image uploads)
- JWT authentication

## Endpoints

### Health
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check |

### Auth
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/login` | Login and get JWT token |

### Inventory
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/inventory` | List all sarees |
| POST | `/api/inventory` | Add a new saree (admin) |
| PUT | `/api/inventory/:id` | Update a saree (admin) |
| DELETE | `/api/inventory/:id` | Delete a saree (admin) |

### Orders
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/orders` | List all orders (admin) |
| POST | `/api/orders` | Place a new order |
| PUT | `/api/orders/:id` | Update order status (admin) |

## Environment Variables

Copy `.env.example` to `.env` and fill in the values:

```env
PORT=5000
JWT_SECRET=your_jwt_secret
CLIENT_URL=http://localhost:5173
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

## Running Locally

```bash
npm install
npm run dev
```

## Deployment

Deployed on [Railway](https://railway.app). Push to `main` triggers auto-deploy.
