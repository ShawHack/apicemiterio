
import { Navigate, useLocation } from "react-router-dom";
import { useContext } from "react";
import { Context as UserContext } from "../../../context/UserContext";


export default function RoleGate({ allow = [], children }) {
  const location = useLocation();
  const ctx = useContext(UserContext) || {};
  const role = ctx.role || JSON.parse(localStorage.getItem("auth") || "{}")?.role || "usuario";
  return allow.includes(role) ? children : <Navigate to="/" replace state={{ from: location }} />;
}
