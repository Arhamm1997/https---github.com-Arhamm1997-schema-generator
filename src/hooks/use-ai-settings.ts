import { useState, useEffect } from 'react';
import { AIProvider, AIProviderConfig, aiProviderManager } from '@/ai/providers';

export function useAISettings() {
  const [configs, setConfigs] = useState<Map<AIProvider, AIProviderConfig>>(new Map());
  const [activeProvider, setActiveProvider] = useState<AIProvider>('gemini');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = () => {
    try {
      const allConfigs = aiProviderManager.getAllConfigs();
      const currentProvider = aiProviderManager.getActiveProvider();
      
      setConfigs(new Map(allConfigs));
      setActiveProvider(currentProvider);
    } catch (error) {
      console.error('Error loading AI settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateApiKey = (provider: AIProvider, apiKey: string) => {
    try {
      console.log('Updating API key for provider:', provider);
      aiProviderManager.setApiKey(provider, apiKey);
      loadSettings(); // Reload to get updated configs
      console.log('API key updated successfully');
    } catch (error) {
      console.error('Error updating API key:', error);
      throw error;
    }
  };

  const setProvider = (provider: AIProvider) => {
    try {
      aiProviderManager.setActiveProvider(provider);
      setActiveProvider(provider);
    } catch (error) {
      console.error('Error setting provider:', error);
      throw error;
    }
  };

  const getProviderConfig = (provider: AIProvider): AIProviderConfig | undefined => {
    return configs.get(provider);
  };

  const getAvailableProviders = (): AIProvider[] => {
    return Array.from(configs.keys()).filter(provider => {
      const config = configs.get(provider);
      return config?.enabled && config?.apiKey;
    });
  };

  const isProviderConfigured = (provider: AIProvider): boolean => {
    const config = configs.get(provider);
    return !!(config?.enabled && config?.apiKey);
  };

  const clearApiKey = (provider: AIProvider) => {
    try {
      aiProviderManager.setApiKey(provider, '');
      loadSettings();
    } catch (error) {
      console.error('Error clearing API key:', error);
      throw error;
    }
  };

  return {
    configs,
    activeProvider,
    isLoading,
    updateApiKey,
    setProvider,
    getProviderConfig,
    getAvailableProviders,
    isProviderConfigured,
    clearApiKey,
    reload: loadSettings
  };
}