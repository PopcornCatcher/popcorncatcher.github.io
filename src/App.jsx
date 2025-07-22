// App.jsx
import React from "react"
import "./App.css"
import GameCanvas from "./pages/Game/GameCanvas"
import { createBrowserRouter, RouterProvider } from "react-router";
import Login from "./pages/Login/Login";
import Scoreboard from "./pages/Scoreboard/Scoreboard";

let router = createBrowserRouter([
  {
    path: "/",
    Component: GameCanvas,
    // loader: loadRootData,
  },
  {
    path: "/login",
    Component: Login,
    // loader: loadRootData,
  },
  {
    path: "/scoreboard",
    Component: Scoreboard,
    // loader: loadRootData,
  },
]);

export default function App() {
  return (
    <RouterProvider router={router}>
    </RouterProvider>
  )
}
