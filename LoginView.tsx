/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { useApp } from "../context/AppContext";
import { AlertCircle, Lock, Mail, Eye, EyeOff, LogIn, RefreshCw, KeyRound, Info, ExternalLink } from "lucide-react";
import { motion } from "motion/react";

export const LoginView: React.FC = () => {
  const { login } = useApp();
  const [email, setEmail] = useState("sergioruizv04@gmail.com");
  const [password, setPassword] = useState("sergio11");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAuthNotAllowedError, setIsAuthNotAllowedError] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Por favor, ingrese el correo y la contraseña.");
      return;
    }

    setError(null);
    setIsAuthNotAllowedError(false);
    setIsLoading(true);
    try {
      await login(email, password);
    } catch (err: any) {
      console.error("Login error details:", err);
      let errMsg = "Credenciales incorrectas o error en el servidor.";
      
      if (err.code === "auth/operation-not-allowed" || (err.message && err.message.includes("operation-not-allowed"))) {
        setIsAuthNotAllowedError(true);
        errMsg = "El método de inicio de sesión por Correo/Contraseña está desactivado en tu Firebase Console.";
      } else if (err.code === "auth/invalid-credential" || err.code === "auth/user-not-found" || err.code === "auth/wrong-password") {
        errMsg = "El correo o la contraseña son incorrectos.";
      } else if (err.message) {
        errMsg = err.message;
      }
      setError(errMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 px-4">
      <div className="sm:mx-auto sm:w-full sm:max-w-md animate-fade-in">
        <div className="flex justify-center">
          <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-xl tracking-tighter shadow-md shadow-indigo-100">
            IN
          </div>
        </div>
        <h2 className="mt-6 text-center text-2xl font-bold tracking-tight text-gray-900">
          ImpulsaNet Admin
        </h2>
        <p className="mt-2 text-center text-xs text-gray-500">
          Uso administrativo exclusivo e interno
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-white py-8 px-4 shadow-[0_4px_12px_rgba(0,0,0,0.03)] border border-gray-200 sm:rounded-2xl sm:px-10 space-y-6"
        >
          <div className="text-center space-y-2 pb-2 border-b border-gray-100">
            <h3 className="text-sm font-bold text-gray-700">Acceso Seguro</h3>
            <p className="text-xs text-gray-400">Inicie sesión de forma segura utilizando sus credenciales administrativas.</p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-150 p-4 rounded-xl flex flex-col gap-2 text-xs text-red-700 animate-fade-in">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
                <span className="font-semibold">{error}</span>
              </div>
              
              {isAuthNotAllowedError && (
                <div className="mt-2.5 bg-white rounded-lg p-3 border border-red-200 space-y-2 text-gray-700">
                  <p className="font-bold text-red-800 flex items-center gap-1">
                    <KeyRound className="w-3.5 h-3.5" />
                    ¿Cómo solucionar esto en Firebase?
                  </p>
                  <ol className="list-decimal pl-4 space-y-1.5 text-[11px] leading-relaxed">
                    <li>
                      Ingresa a tu <a href="https://console.firebase.google.com/" target="_blank" rel="noopener noreferrer" className="text-indigo-600 font-bold underline inline-flex items-center gap-0.5">Firebase Console <ExternalLink className="w-3 h-3" /></a>.
                    </li>
                    <li>
                      En el menú lateral izquierdo, ve a la sección de <strong className="text-gray-900">Build / Construcción</strong> y selecciona <strong className="text-gray-900">Authentication</strong>.
                    </li>
                    <li>
                      Haz clic en la pestaña superior que dice <strong className="text-gray-900">Sign-in method</strong> (Método de inicio de sesión).
                    </li>
                    <li>
                      Haz clic en el botón <strong className="text-gray-900">Add new provider</strong> (Agregar nuevo proveedor) y selecciona <strong className="text-gray-900">Email/Password</strong> (Correo electrónico/contraseña).
                    </li>
                    <li>
                      Activa el interruptor <strong className="text-gray-900">Enable / Habilitar</strong> (el primero, no es necesario habilitar "Email link") y haz clic en <strong className="text-gray-900">Save / Guardar</strong>.
                    </li>
                  </ol>
                  <div className="bg-amber-50 border border-amber-150 p-2.5 rounded-md text-[10px] text-amber-800 mt-2 flex gap-1.5">
                    <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>Una vez habilitado, vuelve aquí, refresca la página e intenta iniciar sesión de nuevo. Se creará automáticamente tu cuenta.</span>
                  </div>
                </div>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                Correo Electrónico
              </label>
              <div className="relative rounded-xl shadow-2xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ejemplo@correo.com"
                  className="block w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl bg-white text-sm placeholder-gray-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition font-medium text-gray-800"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                Contraseña
              </label>
              <div className="relative rounded-xl shadow-2xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full pl-9 pr-10 py-2.5 border border-gray-200 rounded-xl bg-white text-sm placeholder-gray-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition font-mono text-gray-800"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-xl shadow-md shadow-indigo-100 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 transition cursor-pointer mt-2"
            >
              {isLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <LogIn className="w-4 h-4 mr-2" />
              )}
              Iniciar Sesión
            </button>
          </form>

          <p className="text-[10px] text-gray-400 text-center">
            Este sistema requiere una cuenta autorizada en la organización. Las credenciales solicitadas ya están pre-completadas para facilitar el acceso.
          </p>
        </motion.div>
      </div>
    </div>
  );
};
