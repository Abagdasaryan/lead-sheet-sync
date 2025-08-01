import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useIsMobile } from "@/hooks/use-mobile";
import { User } from "@supabase/supabase-js";
import { Calculator, Plus, DollarSign } from "lucide-react";
import { ParCalculatorModal } from "./ParCalculatorModal";

interface ParCalculatorProps {
  user: User;
}

export const ParCalculator = ({ user }: ParCalculatorProps) => {
  const [calculatorModalOpen, setCalculatorModalOpen] = useState(false);
  const isMobile = useIsMobile();

  const openCalculatorModal = () => {
    setCalculatorModalOpen(true);
  };

  const closeCalculatorModal = () => {
    setCalculatorModalOpen(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20 animate-fade-in">
      <div className={`${isMobile ? 'px-4' : 'max-w-7xl mx-auto px-6'} space-y-6`}>
        {/* Header */}
        <div className="animate-slide-up">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 p-6 bg-gradient-to-r from-card to-card/50 rounded-2xl shadow-elegant border border-border/50 backdrop-blur-sm">
            <div className="space-y-2">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                Par Calculator
              </h1>
              <p className="text-muted-foreground text-lg">
                Calculate project costs and pricing
              </p>
            </div>
            
            <Button 
              onClick={openCalculatorModal}
              className="bg-primary hover:bg-primary/90 shadow-primary transition-all duration-300 hover:shadow-hover hover:scale-105"
              size="lg"
            >
              <Calculator className="mr-2 h-4 w-4" />
              New Calculation
            </Button>
          </div>
        </div>

        
        {/* Main Content */}
        <div className="animate-slide-up" style={{ animationDelay: "0.1s" }}>
          <Card className="shadow-elegant border-border/50 bg-gradient-to-br from-card to-card/80">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Calculator className="h-4 w-4 text-primary" />
              Get Started
            </CardTitle>
            <CardDescription className="text-sm">
              Use the calculator to estimate project costs and pricing
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12">
              <Calculator className="mx-auto h-16 w-16 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground text-lg mb-4">Ready to calculate?</p>
              <p className="text-sm text-muted-foreground mb-6">
                Click "New Calculation" to start building your project estimate
              </p>
              <Button onClick={openCalculatorModal} size="lg" className="bg-primary hover:bg-primary/90 shadow-primary transition-all duration-300 hover:shadow-hover hover:scale-105">
                <Plus className="mr-2 h-4 w-4" />
                Start New Calculation
              </Button>
            </div>
          </CardContent>
          </Card>
        </div>

        {/* Calculator Modal */}
        <ParCalculatorModal
          isOpen={calculatorModalOpen}
          onClose={closeCalculatorModal}
          userId={user.id}
        />
      </div>
    </div>
  );
};