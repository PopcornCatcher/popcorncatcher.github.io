import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import "./index.css"
import App from "./App.jsx"
// import { BrowserRouter } from "react-router"

createRoot(document.body).render(
  // <BrowserRouter>
    <StrictMode>
      <App />
    </StrictMode>
  // </BrowserRouter>
)
