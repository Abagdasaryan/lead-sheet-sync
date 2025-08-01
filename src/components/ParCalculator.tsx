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
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold">Par Calculator</h2>
            <p className="text-muted-foreground">Calculate project costs and pricing</p>
          </div>
          
          <Button 
            onClick={openCalculatorModal}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Calculator className="mr-2 h-4 w-4" />
            New Calculation
          </Button>
        </div>


        {/* Main Content */}
        <Card>
          <CardHeader>
            <CardTitle>Get Started</CardTitle>
            <CardDescription>
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
              <Button onClick={openCalculatorModal} size="lg" className="bg-blue-600 hover:bg-blue-700">
                <Plus className="mr-2 h-4 w-4" />
                Start New Calculation
              </Button>
            </div>
          </CardContent>
        </Card>

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