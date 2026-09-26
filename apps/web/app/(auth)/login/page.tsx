"use client";

import React, { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Layers, ArrowRight, Loader2, CheckCircle2 } from "lucide-react";

export default function LoginPage() {
  const { login, register } = useAuth();
  const [tab, setTab] = useState<"login" | "register">("login");
  const [isLoading, setIsLoading] = useState(false);

  // Login form
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Register form
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regWorkspace, setRegWorkspace] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) return;
    setIsLoading(true);
    try {
      await login({ email: loginEmail, password: loginPassword });
    } catch {
      // toast shown in useAuth
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName || !regEmail || !regPassword) return;
    setIsLoading(true);
    try {
      await register({
        name: regName,
        email: regEmail,
        password: regPassword,
        workspace_name: regWorkspace || undefined,
      });
    } catch {
      // toast shown in useAuth
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-500/30 mb-4">
            <Layers className="size-8" />
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Plane Workspaces</h1>
          <p className="text-sm text-slate-400 mt-2">
            Gestión moderna de proyectos, ciclos e incidencias
          </p>
        </div>

        <Card className="border-slate-800 bg-slate-900/90 backdrop-blur shadow-2xl text-slate-100">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-xl text-white">
              {tab === "login" ? "Iniciar Sesión" : "Crear nueva cuenta"}
            </CardTitle>
            <CardDescription className="text-slate-400">
              {tab === "login"
                ? "Accede a tu workspace para continuar tu trabajo"
                : "Regístrate para comenzar a gestionar tus proyectos"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="w-full">
              <TabsList className="grid grid-cols-2 mb-6 bg-slate-800/80">
                <TabsTrigger value="login" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
                  Ingresar
                </TabsTrigger>
                <TabsTrigger value="register" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
                  Registrarse
                </TabsTrigger>
              </TabsList>

              {/* Login Tab */}
              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email" className="text-slate-300">Correo Electrónico</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="nombre@empresa.com"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      required
                      className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus-visible:ring-indigo-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password" className="text-slate-300">Contraseña</Label>
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      required
                      className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus-visible:ring-indigo-500"
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2 rounded-lg transition-colors cursor-pointer mt-2"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        Entrar al Workspace
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </form>
              </TabsContent>

              {/* Register Tab */}
              <TabsContent value="register">
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="reg-name" className="text-slate-300">Nombre Completo</Label>
                    <Input
                      id="reg-name"
                      type="text"
                      placeholder="Ana Pérez"
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      required
                      className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus-visible:ring-indigo-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reg-email" className="text-slate-300">Correo Electrónico</Label>
                    <Input
                      id="reg-email"
                      type="email"
                      placeholder="ana@empresa.com"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      required
                      className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus-visible:ring-indigo-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reg-password" className="text-slate-300">Contraseña</Label>
                    <Input
                      id="reg-password"
                      type="password"
                      placeholder="Mínimo 8 caracteres"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      required
                      minLength={8}
                      className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus-visible:ring-indigo-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reg-workspace" className="text-slate-300">Nombre del Workspace (Opcional)</Label>
                    <Input
                      id="reg-workspace"
                      type="text"
                      placeholder="Ej. Mi Organización"
                      value={regWorkspace}
                      onChange={(e) => setRegWorkspace(e.target.value)}
                      className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus-visible:ring-indigo-500"
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2 rounded-lg transition-colors cursor-pointer mt-2"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        Crear Cuenta y Comenzar
                        <CheckCircle2 className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
