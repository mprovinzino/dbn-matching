import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Building2 } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/dashboard");
      }
    });
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/10">
      <div className="container mx-auto px-4 py-16">
        <div className="flex flex-col items-center justify-center min-h-[80vh] text-center">
          <div className="mb-8 p-6 bg-primary/10 rounded-full">
            <Building2 className="h-20 w-20 text-primary" />
          </div>
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Clever Offers
          </h1>
          <p className="text-2xl text-muted-foreground mb-2">
            Investor Management System
          </p>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl">
            Match real estate investors with property leads based on geographic coverage,
            buy box criteria, and tier rankings
          </p>
          <div className="flex gap-4">
            <Button size="lg" onClick={() => navigate("/auth")}>
              Get Started
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate("/auth")}>
              Sign In
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
