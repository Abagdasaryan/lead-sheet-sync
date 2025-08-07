import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
// Toast removed
import { useRateLimit } from "@/hooks/useRateLimit";
import { validateEmail } from "@/lib/validation";

interface AuthFormProps {}

export const AuthForm = ({}: AuthFormProps) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  // Toast removed
  const authRateLimit = useRateLimit('auth_attempts', { maxAttempts: 5, windowMs: 300000 }); // 5 attempts per 5 minutes

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check rate limit
    if (!authRateLimit.canProceed) {
      // Rate limit exceeded - removed toast
      return;
    }

    // Validate email
    if (!validateEmail(email)) {
      // Invalid email - removed toast
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) throw error;
      
      // Success - removed toast
    } catch (error: any) {
      // Error - removed toast
    } finally {
      setLoading(false);
    }
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check rate limit
    if (!authRateLimit.canProceed) {
      // Rate limit exceeded - removed toast
      return;
    }

    // Validate email
    if (!validateEmail(email)) {
      // Invalid email - removed toast
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
        },
      });
      
      if (error) throw error;
      
      // Success - removed toast
    } catch (error: any) {
      // Error - removed toast
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check rate limit
    if (!authRateLimit.canProceed) {
      // Rate limit exceeded - removed toast
      return;
    }

    // Validate email
    if (!validateEmail(email)) {
      // Invalid email - removed toast
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      
      if (error) throw error;
      
      // Success - removed toast
    } catch (error: any) {
      // Error - removed toast
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Authentication</CardTitle>
        <CardDescription>
          Login with email/password, magic link, or reset your password
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="login" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="login">Login</TabsTrigger>
            <TabsTrigger value="magic">Magic Link</TabsTrigger>
            <TabsTrigger value="reset">Reset Password</TabsTrigger>
          </TabsList>
          
          <TabsContent value="login">
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <Input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div>
                <Input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Loading..." : "Login"}
              </Button>
            </form>
          </TabsContent>
          
          <TabsContent value="magic">
            <form onSubmit={handleMagicLink} className="space-y-4">
              <div>
                <Input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Sending..." : "Send Magic Link"}
              </Button>
            </form>
          </TabsContent>
          
          <TabsContent value="reset">
            <form onSubmit={handlePasswordReset} className="space-y-4">
              <div>
                <Input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Sending..." : "Send Reset Email"}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};