import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { validateUrl } from '@/lib/validation';
import { useErrorHandler } from './useErrorHandler';

export const useSecureWebhook = () => {
  const [loading, setLoading] = useState(false);
  const { handleError, handleSuccess } = useErrorHandler();

  const getSecureWebhookUrl = async (webhookName: string, fallbackUrl?: string): Promise<string | null> => {
    try {
      const { data, error } = await supabase
        .from('webhook_configs')
        .select('url')
        .eq('name', webhookName)
        .eq('is_active', true)
        .single();
      
      if (data && !error && validateUrl(data.url)) {
        return data.url;
      }
      
      if (fallbackUrl && validateUrl(fallbackUrl)) {
        console.warn(`Using fallback webhook URL for ${webhookName}`);
        return fallbackUrl;
      }
      
      throw new Error(`No valid webhook URL found for ${webhookName}`);
    } catch (error: any) {
      handleError(error, 'Webhook Configuration');
      return null;
    }
  };

  const updateWebhookConfig = async (name: string, url: string, description?: string): Promise<boolean> => {
    if (!validateUrl(url)) {
      handleError(new Error('Invalid webhook URL format'), 'Webhook Configuration');
      return false;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('webhook_configs')
        .upsert({
          name,
          url,
          description,
          is_active: true,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'name'
        });

      if (error) throw error;
      
      handleSuccess(`Webhook configuration updated for ${name}`);
      return true;
    } catch (error: any) {
      handleError(error, 'Webhook Configuration');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const validateWebhookPayload = (payload: any): boolean => {
    if (!payload || typeof payload !== 'object') {
      return false;
    }

    // Check for required fields and reasonable limits
    if (payload.lineItems && Array.isArray(payload.lineItems)) {
      if (payload.lineItems.length > 100) {
        handleError(new Error('Too many line items'), 'Webhook Validation');
        return false;
      }
    }

    return true;
  };

  return {
    getSecureWebhookUrl,
    updateWebhookConfig,
    validateWebhookPayload,
    loading
  };
};