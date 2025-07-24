import { useToast } from "@/hooks/use-toast";
import { ApiError } from "@/types/sheets";

export const useErrorHandler = () => {
  const { toast } = useToast();

  const sanitizeErrorMessage = (message: string): string => {
    // Remove sensitive information from error messages
    return message
      .replace(/password/gi, '[PROTECTED]')
      .replace(/token/gi, '[PROTECTED]')
      .replace(/key/gi, '[PROTECTED]')
      .replace(/secret/gi, '[PROTECTED]')
      .replace(/Bearer\s+[^\s]+/gi, 'Bearer [PROTECTED]')
      .substring(0, 500); // Limit message length
  };

  const handleError = (error: Error | ApiError | any, context?: string) => {
    // Log full error for debugging (server-side only in production)
    console.error(`Error${context ? ` in ${context}` : ''}:`, error);
    
    let message = 'An unexpected error occurred';
    
    if (error?.message) {
      // Sanitize error message before showing to user
      message = sanitizeErrorMessage(error.message);
    }
    
    // Provide more user-friendly messages for common errors
    if (error?.message?.includes('duplicate key')) {
      message = 'This item already exists';
    } else if (error?.message?.includes('violates row-level security')) {
      message = 'Access denied. Please check your permissions.';
    } else if (error?.message?.includes('Network request failed')) {
      message = 'Network error. Please check your connection.';
    } else if (error?.message?.includes('Invalid user token')) {
      message = 'Session expired. Please log in again.';
    }
    
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