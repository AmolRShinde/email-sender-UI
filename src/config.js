const BASE_URL =
  process.env.NODE_ENV === "production"
    ? "https://sendmails-backend.onrender.com"
    : "http://localhost:8080";

export default BASE_URL;
