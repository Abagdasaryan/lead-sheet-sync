import { useToast } from "@/hooks/use-toast";
import { ApiError } from "@/types/sheets";

export const useErrorHandler = () => {
  const { toast } = useToast();

  const handleError = (error: Error | ApiError | any, context?: string) => {
    console.error(`Error${context ? ` in ${context}` : ''}:`, error);
    
    const message = error?.message || 'An unexpected error occurred';
    const title = context ? `Error in ${context}` : 'Error';
    
    toast({
      title,
      description: message,
      variant: "destructive",
    });
  };

  const handleSuccess = (message: string, title = "Success") => {
    toast({
      title,
      description: message,
    });
  };

  const handleInfo = (message: string, title = "Info") => {
    toast({
      title,
      description: message,
    });
  };

  return {
    handleError,
    handleSuccess,
    handleInfo,
  };
};