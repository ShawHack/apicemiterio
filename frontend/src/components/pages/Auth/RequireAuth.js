
import { Navigate, useLocation } from "react-router-dom";
import { useContext } from "react";
import { Context as UserContext } from "../../../context/UserContext";


export default function RequireAuth({ children }) {
  const location = useLocation();
  const ctx = useContext(UserContext) || {};
  const hasToken = ctx.token || JSON.parse(localStorage.getItem("auth") || "{}")?.token;

  if (!hasToken && !ctx.authenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return children;
}
