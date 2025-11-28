// src/App.jsx
import { useAuth } from "./context/AuthContext";
import Login from "./components/Login";
import Dashboard from "./components/Dashboard";

export default function App() {
  const { user } = useAuth();

  
  return user ? (
    <Dashboard />
  ) : (
    <Login />
  );
}
