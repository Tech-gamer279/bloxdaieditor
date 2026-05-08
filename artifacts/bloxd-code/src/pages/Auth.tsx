import { useEffect } from "react";
import { useLocation } from "wouter";

const Auth = () => {
  const [, navigate] = useLocation();
  useEffect(() => { navigate("/sign-in"); }, []);
  return null;
};

export default Auth;
