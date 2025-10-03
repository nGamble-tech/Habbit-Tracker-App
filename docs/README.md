# Getting Started

---

## Project Structure

- **backend/** → Backend API (Node.js + Express)
- **frontend/** → Frontend UI (Vite + React)

### 1. Set up Backend

#### Install Dependencies:

SSH:

```bash
cd backend
npm install
```

#### Enviroment Setup:

Create .env file and copy information from GroupMe into it

---

### 2. Setup Frontend

#### Install Dependencies:

SSH:

```bash
cd frontend
npm install
```

#### Enviroment Setup:

Create .env file here as well and copy `_VITE_API_URL=http://localhost:4000_` into it

---

### 3. Test API

Once dependecies installed and enviroments have been set up, you can run the server with `npm run dev` and this will get the ball rolling.
You can then test the backend API with Postman, it should be running at `http://localhost:4000`.
