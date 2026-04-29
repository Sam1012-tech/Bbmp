import { createBrowserRouter } from "react-router";
import { Root } from "./components/Root";
import { MapDashboard } from "./components/MapDashboard";
import { OfficerDashboard } from "./components/OfficerDashboard";
import { TruckRoutes } from "./components/TruckRoutes";
import { Analytics } from "./components/Analytics";
import { Login } from "./components/Login";
import { Signup } from "./components/Signup";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Root,
    children: [
      { index: true, Component: MapDashboard },
      { path: "officer", Component: OfficerDashboard },
      { path: "trucks", Component: TruckRoutes },
      { path: "analytics", Component: Analytics },
    ],
  },
  { path: "/login", Component: Login },
  { path: "/signup", Component: Signup },
]);
