import React, { useState } from "react";

export default function LoginTest() {
  const [email, setEmail] = useState("test@example.org");
  const [password, setPassword] = useState("password123");
  const [status, setStatus] = useState("");

  async function handleLogin(e) {
    e.preventDefault();
    setStatus("Logging in...");

    try {
      const response = await fetch("https://localhost:5047/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        setStatus("Login failed: " + (data.error || "Unknown error"));
        return;
      }

      // Store tokens for later use in their own tester programs
      localStorage.setItem("access_token", data.access_token);
      localStorage.setItem("refresh_token", data.refresh_token);

      setStatus("Success! Tokens saved to localStorage.");
    } catch (err) {
      setStatus("Error connecting to auth service: " + err.message);
    }
  }

  return (
    <div style={styles.container}>
      <h2>Auth Microservice Login Tester</h2>
      <form onSubmit={handleLogin} style={styles.form}>
        <label>Email</label>
        <input
          type="email"
          value={email}
          style={styles.input}
          onChange={(e) => setEmail(e.target.value)}
        />

        <label>Password</label>
        <input
          type="password"
          value={password}
          style={styles.input}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button type="submit" style={styles.button}>
          Log In
        </button>
      </form>

      <p style={styles.status}>{status}</p>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: "400px",
    margin: "40px auto",
    padding: "20px",
    border: "1px solid #ddd",
    borderRadius: "8px",
    fontFamily: "Arial, sans-serif"
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "8px"
  },
  input: {
    padding: "8px",
    fontSize: "1rem"
  },
  button: {
    padding: "10px",
    marginTop: "10px",
    backgroundColor: "#2b67f6",
    color: "#fff",
    fontSize: "1rem",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer"
  },
  status: {
    marginTop: "1rem",
    fontWeight: "bold"
  }
};
